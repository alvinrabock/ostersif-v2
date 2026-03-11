"use server";

/**
 * Tournament/League Sync Logic — SMC + SvFF → Frontspace CMS
 *
 * Syncs league/tournament data to the "Turneringar" post type from:
 * - SMC API (via league-cache.json) — men's leagues only
 * - SvFF API (forening-api.svenskfotboll.se) — all leagues incl. women's
 *
 * Both sources use the same slug pattern (seasonYear-name) so records merge
 * cleanly when both sources cover the same competition.
 */

import { getLeagueCache } from "./leagueCache";
import { fetchSvFFClubDetails } from "./svff/fetchClubDetails";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./frontspace/client";

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

const TURNERINGAR_POST_TYPE_ID = 'f73c99ff-7812-4310-9b1a-d43ba019e54e';

// ─── Lag (Teams) lookup ──────────────────────────────────────────────────────

/** Fetch all "lag" posts from CMS and build a FOGIS team ID → post map */
async function fetchLagByFogisTeamId(): Promise<Map<string, { id: string; title: string; slug: string }>> {
  const query = `
    query GetLag($storeId: String!, $limit: Int) {
      posts(storeId: $storeId, postTypeSlug: "lag", limit: $limit) {
        posts { id title slug content }
      }
    }
  `;

  try {
    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': FRONTSPACE_STORE_ID,
        ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
      },
      body: JSON.stringify({ query, variables: { storeId: FRONTSPACE_STORE_ID, limit: 200 } }),
    });

    const result = await response.json();
    const posts = result.data?.posts?.posts || [];
    const map = new Map<string, { id: string; title: string; slug: string }>();
    for (const post of posts) {
      const content = typeof post.content === 'string'
        ? (() => { try { return JSON.parse(post.content); } catch { return {}; } })()
        : (post.content || {});
      const fogisId = content['fogis_teamid'] || content['FOGIS-teamId'] || content['fogis-teamid'] || content['fogis_team_id'];
      if (fogisId) {
        map.set(String(fogisId), { id: post.id, title: post.title, slug: post.slug });
      }
    }
    console.log(`👥 Found ${map.size} lag with FOGIS team IDs: ${Array.from(map.entries()).map(([id, l]) => `${l.title}(${id})`).join(', ')}`);
    return map;
  } catch (error) {
    console.error('Failed to fetch lag:', error);
    return new Map();
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface LeagueData {
  leagueId: string;
  leagueName: string;
  startDate: string;
  endDate: string;
  tournamentId: number;
  seasonYear: string;
  ostersTeamId?: string;
}

interface SyncPayload {
  slug: string;
  title: string;
  action: 'create' | 'update';
  content: Record<string, any>;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  timestamp: string;
  payloads?: SyncPayload[];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toSlugSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface TurneringarIndex {
  bySlug: Map<string, any>;
  byCompetitionId: Map<number, any>;
  byTournamentId: Map<number, any>;
}

async function fetchExistingTurneringar(): Promise<TurneringarIndex> {
  const query = `
    query GetTurneringar($storeId: String!, $limit: Int) {
      posts(storeId: $storeId, postTypeSlug: "turneringar", limit: $limit) {
        posts { id title slug content status }
        totalCount
      }
    }
  `;

  const empty: TurneringarIndex = { bySlug: new Map(), byCompetitionId: new Map(), byTournamentId: new Map() };

  try {
    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': FRONTSPACE_STORE_ID,
        ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
      },
      body: JSON.stringify({ query, variables: { storeId: FRONTSPACE_STORE_ID, limit: 500 } }),
    });

    const result = await response.json();
    if (result.error || result.errors) return empty;

    const posts = result.data?.posts?.posts || [];
    const index: TurneringarIndex = { bySlug: new Map(), byCompetitionId: new Map(), byTournamentId: new Map() };
    for (const post of posts) {
      if (post.slug) index.bySlug.set(post.slug, post);
      const content = typeof post.content === 'string' ? (() => { try { return JSON.parse(post.content); } catch { return {}; } })() : (post.content || {});
      if (content.svff_competition_id) index.byCompetitionId.set(Number(content.svff_competition_id), post);
      if (content.tournamentid) index.byTournamentId.set(Number(content.tournamentid), post);
    }
    return index;
  } catch {
    return empty;
  }
}

/** Find an existing CMS post by slug, svff_competition_id, or tournamentid */
function findExistingPost(index: TurneringarIndex, slug: string, competitionId?: number, tournamentId?: number): any | undefined {
  return index.bySlug.get(slug)
    || (competitionId ? index.byCompetitionId.get(competitionId) : undefined)
    || (tournamentId ? index.byTournamentId.get(tournamentId) : undefined);
}

/**
 * Generic upsert to CMS Turneringar.
 * Merges apiContent over existingContent, preserving manual fields
 * (kalender_url, visa_i_filter, visningsnamn).
 */
async function upsertTurneringarToCMS(
  slug: string,
  title: string,
  apiContent: Record<string, any>,
  existingPost: any | null
): Promise<{ action: 'created' | 'updated'; error?: string; content: Record<string, any> }> {
  const existingContent = existingPost
    ? (typeof existingPost.content === 'string' ? JSON.parse(existingPost.content) : existingPost.content || {})
    : {};
  const content = existingPost ? { ...existingContent, ...apiContent } : apiContent;

  const mutation = existingPost
    ? `mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
        updatePost(id: $id, input: $input) { id slug title }
      }`
    : `mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) { id slug title }
      }`;

  const variables = existingPost
    ? { id: existingPost.id, input: { title, content, status: 'published' } }
    : { input: { postTypeId: TURNERINGAR_POST_TYPE_ID, title, slug, content, status: 'published' } };

  const action = existingPost ? 'updated' as const : 'created' as const;

  try {
    console.log(`📤 ${existingPost ? 'UPDATE' : 'CREATE'}: ${title}`);

    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': FRONTSPACE_STORE_ID,
        ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const text = await response.text();
    if (!text || !text.trim()) {
      console.log(`   ✅ Success (empty response body)`);
      return { action, content };
    }

    const result = JSON.parse(text);
    if (result.error) return { action, error: `API Error: ${result.error}`, content };
    if (result.errors) return { action, error: result.errors[0]?.message || 'GraphQL error', content };

    const mutationResult = result.data?.createPost || result.data?.updatePost;
    if (!mutationResult) return { action, error: 'No data returned from CMS mutation', content };

    console.log(`   ✅ Success: ${mutationResult.id}`);
    return { action, content };
  } catch (error) {
    return { action, error: error instanceof Error ? error.message : 'Unknown error', content };
  }
}

// ─── SMC sync ─────────────────────────────────────────────────────────────────

function detectKon(leagueName: string): 'dam' | 'herr' {
  const lower = leagueName.toLowerCase();
  if (lower.includes('dam') || lower.includes('kvinn') || lower.includes('elitettan') || lower.includes('woman') || lower.includes('female')) {
    return 'dam';
  }
  return 'herr';
}

function transformLeagueToCMSContent(league: LeagueData): Record<string, any> {
  return {
    // CMS standard fields
    sasong: league.seasonYear,
    gendername: detectKon(league.leagueName),
    startdatum: league.startDate.split('T')[0],
    slutdatum: league.endDate.split('T')[0],
    lastsyncedat: new Date().toISOString(),
    // SMC-specific fields
    smc_leagueid: league.leagueId,
    smc_tournamentid: league.tournamentId,
    smc_ostersteamid: league.ostersTeamId || '',
    smc_externalleagueid: league.leagueId,
  };
}

function generateLeagueSlug(league: LeagueData): string {
  return `${league.seasonYear}-${toSlugSegment(league.leagueName)}`;
}

/**
 * Syncs leagues from the SMC file cache to CMS Turneringar.
 */
export async function syncTurneringarToCMS(
  options?: { dryRun?: boolean; limit?: number; season?: string }
): Promise<SyncResult> {
  const { dryRun = false, limit, season } = options || {};
  const result: SyncResult = {
    success: false, created: 0, updated: 0, skipped: 0, errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    console.log('🔄 Starting SMC turneringar sync...');
    const cache = await getLeagueCache();
    if (!cache || cache.leagues.length === 0) {
      result.errors.push('League cache is empty. Please refresh the cache first.');
      return result;
    }

    let leagues = cache.leagues;
    if (season && season !== 'all') leagues = leagues.filter(l => l.seasonYear === season);
    if (limit && limit > 0) leagues = leagues.slice(0, limit);

    console.log(`📋 Processing ${leagues.length} leagues`);
    if (leagues.length === 0) { result.success = true; return result; }

    const existingIndex = await fetchExistingTurneringar();
    console.log(`📦 Found ${existingIndex.bySlug.size} existing turneringar in CMS`);

    if (dryRun) {
      result.payloads = leagues.map(league => {
        const slug = generateLeagueSlug(league);
        const existingPost = findExistingPost(existingIndex, slug, undefined, league.tournamentId ? Number(league.tournamentId) : undefined);
        const apiContent = transformLeagueToCMSContent(league);
        const existingContent = existingPost
          ? (typeof existingPost.content === 'string' ? JSON.parse(existingPost.content) : existingPost.content || {})
          : {};
        const content = existingPost ? { ...existingContent, ...apiContent } : apiContent;
        return { slug: existingPost?.slug || slug, title: league.leagueName, action: existingPost ? 'update' as const : 'create' as const, content };
      });
      result.created = result.payloads.filter(p => p.action === 'create').length;
      result.updated = result.payloads.filter(p => p.action === 'update').length;
      result.success = true;
      return result;
    }

    result.payloads = [];
    for (const league of leagues) {
      const slug = generateLeagueSlug(league);
      const existingPost = findExistingPost(existingIndex, slug, undefined, league.tournamentId ? Number(league.tournamentId) : undefined);
      const effectiveSlug = existingPost?.slug || slug;
      const { action, error, content } = await upsertTurneringarToCMS(effectiveSlug, league.leagueName, transformLeagueToCMSContent(league), existingPost);
      result.payloads.push({ slug: effectiveSlug, title: league.leagueName, action: action === 'created' ? 'create' : 'update', content });
      if (error) result.errors.push(`${league.leagueName}: ${error}`);
      if (action === 'created') result.created++;
      else result.updated++;
    }

    result.success = result.errors.length === 0;
    console.log(`✅ SMC sync: ${result.created} created, ${result.updated} updated`);
    if (result.created > 0 || result.updated > 0) {
      revalidateTag('turneringar');
      revalidateTag(CACHE_TAGS.FRONTSPACE);
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

// ─── SvFF sync ────────────────────────────────────────────────────────────────

function mapSvffGender(genderName?: string): 'herr' | 'dam' {
  const lower = (genderName || '').toLowerCase();
  if (lower.includes('woman') || lower.includes('female') || lower.includes('dam') || lower.includes('kvinn')) {
    return 'dam';
  }
  return 'herr';
}

/** Extract season year from competition name or seasonId, e.g. "Superettan 2026" → "2026" */
function extractSeasonYear(competitionName: string, seasonId?: number): string {
  const matches = competitionName.match(/\d{4}/g);
  if (matches) return matches[matches.length - 1];
  if (seasonId) {
    const baseYear = 2026 - (119 - seasonId);
    if (baseYear > 2000) return String(baseYear);
  }
  return new Date().getFullYear().toString();
}

/**
 * Detect cross-season end year from competition name, e.g. "Svenska Cupen 2025/26" → "2026"
 * Returns undefined if not a cross-season tournament.
 */
function extractCrossSeasonEndYear(competitionName: string): string | undefined {
  const match = competitionName.match(/(\d{4})\/(\d{2,4})/);
  if (!match) return undefined;
  const startYear = match[1];
  const endPart = match[2];
  return endPart.length === 2 ? startYear.slice(0, 2) + endPart : endPart;
}

/** Strip year(s) from a competition name before slugifying */
function stripYearFromName(name: string): string {
  return name
    .replace(/\s*\d{4}(\/\d{2,4})?\s*/g, ' ')
    .trim();
}

interface SvffCompetition {
  competitionId: number;
  competitionName: string;
  genderName?: string;
  seasonId?: number;
  ageCategoryName?: string;
  footballTypeName?: string;
  fogisTeamId?: string;
}

function transformSvffCompetitionToCMS(
  comp: SvffCompetition,
  seasonYear: string,
  lagPost?: { id: string; title: string; slug: string }
): Record<string, any> {
  const gender = mapSvffGender(comp.genderName);
  const content: Record<string, any> = {
    sasong: seasonYear,
    gendername: gender,
    lastsyncedat: new Date().toISOString(),
    svff_competition_id: String(comp.competitionId),
    svff_season_id: String(comp.seasonId || ''),
    fogis_team_id: comp.fogisTeamId || '',
  };
  // Cross-season tournaments (e.g., "Svenska Cupen 2025/26") → store end year
  const endYear = extractCrossSeasonEndYear(comp.competitionName);
  if (endYear && endYear !== seasonYear) {
    content.sasong_till = endYear;
  }
  if (lagPost) {
    content.lag = lagPost.id;
  }
  return content;
}

/** Fetch lag posts and return enabled FOGIS team IDs */
async function fetchEnabledTeamIds(): Promise<Map<string, { id: string; title: string; slug: string }>> {
  const query = `
    query GetLag($storeId: String!, $limit: Int) {
      posts(storeId: $storeId, postTypeSlug: "lag", limit: $limit) {
        posts { id title slug content }
      }
    }
  `;

  try {
    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': FRONTSPACE_STORE_ID,
        ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
      },
      body: JSON.stringify({ query, variables: { storeId: FRONTSPACE_STORE_ID, limit: 200 } }),
    });

    const result = await response.json();
    const posts = result.data?.posts?.posts || [];
    const map = new Map<string, { id: string; title: string; slug: string }>();
    for (const post of posts) {
      const content = typeof post.content === 'string'
        ? (() => { try { return JSON.parse(post.content); } catch { return {}; } })()
        : (post.content || {});
      const fogisId = content['fogis_teamid'] || content['FOGIS-teamId'] || content['fogis-teamid'] || content['fogis_team_id'];
      const isSef = content.fetchfromsefapi === true || content.fetchfromsefapi === 'true';
      if (fogisId && isSef) {
        map.set(String(fogisId), { id: post.id, title: post.title, slug: post.slug });
      }
    }
    return map;
  } catch (error) {
    console.error('Failed to fetch lag:', error);
    return new Map();
  }
}

/**
 * Syncs competitions from SvFF to CMS Turneringar.
 * Uses /club/details (1 API call) to get all team engagements,
 * then filters to only enabled teams (fetchfromsefapi in CMS).
 */
export async function syncTurneringarFromSvFF(
  options?: { dryRun?: boolean; limit?: number }
): Promise<SyncResult> {
  const { dryRun = false, limit } = options || {};
  const result: SyncResult = {
    success: false, created: 0, updated: 0, skipped: 0, errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Fetch enabled teams from CMS and club details from SvFF (in parallel)
    const [enabledTeams, clubDetails, existingIndex] = await Promise.all([
      fetchEnabledTeamIds(),
      fetchSvFFClubDetails(),
      fetchExistingTurneringar(),
    ]);

    if (enabledTeams.size === 0) {
      result.errors.push('No teams with fetchFromSEFAPI enabled in CMS');
      return result;
    }

    console.log(`🔄 Starting SvFF turneringar sync...`);
    console.log(`👥 Enabled teams: ${Array.from(enabledTeams.entries()).map(([id, t]) => `${t.title} (${id})`).join(', ')}`);

    if (!clubDetails) {
      result.errors.push('No data returned from SvFF club details API');
      return result;
    }

    // 2. Filter teamEngagements to only enabled teams, dedup by competitionId
    const competitionsMap = new Map<number, SvffCompetition>();
    for (const engagement of clubDetails.teamEngagements || []) {
      const teamId = String(engagement.teamId);
      if (!enabledTeams.has(teamId)) continue;

      const comp = engagement.competition;
      if (!comp?.competitionId) continue;

      if (!competitionsMap.has(comp.competitionId)) {
        competitionsMap.set(comp.competitionId, {
          competitionId: comp.competitionId,
          competitionName: comp.name || engagement.competitionName || '',
          genderName: comp.genderName,
          seasonId: comp.seasonId,
          ageCategoryName: comp.ageCategoryName,
          footballTypeName: comp.footballTypeName,
          fogisTeamId: teamId,
        });
      }
    }

    let competitions = Array.from(competitionsMap.values());
    console.log(`🏆 Found ${competitions.length} competitions for enabled teams (${clubDetails.teamEngagements?.length ?? 0} total engagements)`);

    if (limit && limit > 0) competitions = competitions.slice(0, limit);

    console.log(`📦 Found ${existingIndex.bySlug.size} existing turneringar in CMS`);

    if (dryRun) {
      result.payloads = competitions.map(comp => {
        const seasonYear = extractSeasonYear(comp.competitionName, comp.seasonId);
        const slug = `${seasonYear}-${toSlugSegment(stripYearFromName(comp.competitionName))}`;
        const existingPost = findExistingPost(existingIndex, slug, comp.competitionId);
        const lagPost = comp.fogisTeamId ? enabledTeams.get(comp.fogisTeamId) : undefined;
        const apiContent = transformSvffCompetitionToCMS(comp, seasonYear, lagPost);
        const existingContent = existingPost
          ? (typeof existingPost.content === 'string' ? JSON.parse(existingPost.content) : existingPost.content || {})
          : {};
        const content = existingPost ? { ...existingContent, ...apiContent } : apiContent;
        return { slug: existingPost?.slug || slug, title: comp.competitionName, action: existingPost ? 'update' as const : 'create' as const, content };
      });
      result.created = result.payloads.filter(p => p.action === 'create').length;
      result.updated = result.payloads.filter(p => p.action === 'update').length;
      result.success = true;
      console.log(`✅ SvFF dry run: ${result.created} would be created, ${result.updated} would be updated`);
      return result;
    }

    result.payloads = [];
    for (const comp of competitions) {
      const seasonYear = extractSeasonYear(comp.competitionName, comp.seasonId);
      const slug = `${seasonYear}-${toSlugSegment(stripYearFromName(comp.competitionName))}`;
      const existingPost = findExistingPost(existingIndex, slug, comp.competitionId);
      const lagPost = comp.fogisTeamId ? enabledTeams.get(comp.fogisTeamId) : undefined;
      const effectiveSlug = existingPost?.slug || slug;
      const { action, error, content } = await upsertTurneringarToCMS(effectiveSlug, comp.competitionName, transformSvffCompetitionToCMS(comp, seasonYear, lagPost), existingPost);
      result.payloads.push({ slug: effectiveSlug, title: comp.competitionName, action: action === 'created' ? 'create' : 'update', content });
      if (error) result.errors.push(`${comp.competitionName}: ${error}`);
      if (action === 'created') result.created++;
      else result.updated++;
    }

    result.success = result.errors.length === 0;
    console.log(`✅ SvFF sync: ${result.created} created, ${result.updated} updated`);
    if (result.created > 0 || result.updated > 0) {
      revalidateTag('turneringar');
      revalidateTag(CACHE_TAGS.FRONTSPACE);
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}
