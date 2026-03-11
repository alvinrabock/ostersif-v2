"use server";

/**
 * SvFF Match Sync Logic - SvFF API → Frontspace CMS
 *
 * Syncs match data from SvFF (Svenska Fotbollförbundet) to Frontspace CMS.
 * Handles ALL club teams (herrar, damer, youth) — replacing SMC sync for scheduling.
 *
 * Dedup Strategy:
 * Uses a composite key stored in CMS field `match_unique_key`:
 *   normalizedHome|normalizedAway|date|time|arena
 * 1. First lookup by `match_unique_key` field (fast, for already-synced matches)
 * 2. Fallback: compute key from existing CMS fields (for SMC matches without the key yet)
 * 3. Always writes `match_unique_key` on create/update so future lookups are instant
 * Never overwrites SMC fields (externalmatchid, externalleagueid) so live data keeps working.
 */

import { fetchSvFFGames, type SvFFGame } from "./svff/fetchSvffGames";
import { CACHE_TAGS } from "./frontspace/client";
import { revalidateTag, revalidatePath } from "next/cache";

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

const MATCHER_POST_TYPE_ID = '5e8b21d9-5c7a-4919-8dc2-0ccde6108964';

/** Östers IF team name variations for matching.
 *  Must include "if" to avoid matching "Östersund". */
const OSTERS_IF_NAMES = ['östers if', 'osters if'];

function isOstersIF(teamName: string): boolean {
  const normalized = teamName.toLowerCase().trim();
  return OSTERS_IF_NAMES.some(name => normalized.includes(name));
}

/** Normalize "Östers IF (5)" → "Östers IF" — SvFF appends team numbers in some competitions */
function normalizeOstersName(teamName: string): string {
  if (isOstersIF(teamName)) {
    return teamName.replace(/\s*\(\d+\)\s*$/, '').trim();
  }
  return teamName;
}

interface SyncPayload {
  slug: string;
  title: string;
  action: 'create' | 'update' | 'skip';
  content: Record<string, unknown>;
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

// ─── Composite Key ───────────────────────────────────────────────────────────

/**
 * Build a slugified dedup key from match fields.
 * Format: "2026-04-03_15-00_olympia-helsingborg"
 * No team names — avoids SMC/SvFF name mismatches.
 * Shared format with SMC sync (syncMatches.ts)
 */
function buildMatchKey(date: string, time: string, arena: string): string {
  const slugTime = time.replace(':', '-');
  const slugArena = arena.toLowerCase().trim()
    .replace(/[^a-z0-9åäö\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${date}_${slugTime}_${slugArena}`;
}

// ─── SvFF → CMS Field Mapping ────────────────────────────────────────────────

/**
 * Split SvFF ISO datetime into date + time parts (Swedish timezone)
 */
function splitDateTime(isoDate: string): { datum: string; tid_for_avspark: string } {
  if (!isoDate) return { datum: '', tid_for_avspark: '' };

  // Parse and format in Swedish timezone for consistent results
  const date = new Date(isoDate);
  const datum = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }).replace(/\//g, '-');
  const tid_for_avspark = date.toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return { datum, tid_for_avspark };
}

/**
 * Map SvFF game status flags to CMS match_status select value
 */
function mapSvffStatus(game: SvFFGame): string {
  if (game.isFinished) return 'over';
  if (game.isAbandoned) return 'over';
  if (game.isPostponed) return 'scheduled';
  return 'scheduled';
}

/**
 * Generate a URL-safe slug from SvFF game data
 */
function generateSlug(game: SvFFGame): string {
  const { datum } = splitDateTime(game.timeAsDateTime);
  const homeSafe = normalizeOstersName(game.homeTeamName).toLowerCase().replace(/[^a-z0-9åäö]/g, '-').replace(/-+/g, '-');
  const awaySafe = normalizeOstersName(game.awayTeamName).toLowerCase().replace(/[^a-z0-9åäö]/g, '-').replace(/-+/g, '-');
  return `${datum}-${homeSafe}-vs-${awaySafe}`;
}

interface RelationLookups {
  /** Map of FOGIS team ID → CMS lag post ID */
  lagByFogisId: Map<string, string>;
  /** Map of svff_competition_id → CMS turneringar post ID */
  turneringByCompId: Map<string, string>;
  /** Map of svff_competition_id → { lagId, fogisTeamId } (derived from turneringar) */
  lagByCompId: Map<string, { lagId: string; fogisTeamId: string }>;
  /** Set of enabled FOGIS team IDs (from CMS lag with fetchfromsefapi) */
  enabledFogisIds: Set<string>;
}

/**
 * Transform a SvFF game into CMS content fields
 */
function transformGameToCMSContent(game: SvFFGame, lookups?: RelationLookups): Record<string, unknown> {
  const { datum, tid_for_avspark } = splitDateTime(game.timeAsDateTime);
  const sasong = game.timeAsDateTime ? new Date(game.timeAsDateTime).getFullYear().toString() : '';
  const matchKey = buildMatchKey(datum, tid_for_avspark, game.venueName || '');

  const content: Record<string, unknown> = {
    hemmalag: normalizeOstersName(game.homeTeamName),
    bortalag: normalizeOstersName(game.awayTeamName),
    datum,
    tid_for_avspark,
    arena: game.venueName || '',
    match_status: mapSvffStatus(game),
    mal_hemmalag: game.goalsScoredHomeTeam ?? 0,
    mal_bortalag: game.goalsScoredAwayTeam ?? 0,
    leaguename: game.competitionName || '',
    sasong,
    svff_game_id: String(game.gameId),
    match_unique_key: matchKey,
    iscustomgame: "false",
    lastsyncedat: new Date().toISOString(),
  };

  // Set externalleagueid for filter compatibility (uses svff_competition_id)
  if (game.competitionId) {
    content.externalleagueid = String(game.competitionId);
    content.svff_competition_id = String(game.competitionId);
  }

  if (lookups) {
    // Set turnering relation via competition ID
    if (game.competitionId) {
      const turneringId = lookups.turneringByCompId.get(String(game.competitionId));
      if (turneringId) content.turnering = turneringId;
    }

    // Set lag relation directly via FOGIS team ID (from game data)
    const ostersTeamId = isOstersIF(game.homeTeamName) ? game.homeTeamId : game.awayTeamId;
    if (ostersTeamId) {
      const lagId = lookups.lagByFogisId.get(String(ostersTeamId));
      if (lagId) content.lag = lagId;
      content.fogis_team_id = String(ostersTeamId);
    }
  }

  return content;
}

// ─── CMS Upsert ──────────────────────────────────────────────────────────────

/**
 * Create or update a match in Frontspace CMS
 */
async function upsertSvffMatchToCMS(
  game: SvFFGame,
  existingCMSMatch: { id: string; content: Record<string, unknown> } | null,
  lookups?: RelationLookups,
): Promise<{ action: 'created' | 'updated' | 'skipped'; error?: string }> {
  const title = `${normalizeOstersName(game.homeTeamName)} vs ${normalizeOstersName(game.awayTeamName)}`;
  const slug = generateSlug(game);

  // Build new content from SvFF data
  const newContent = transformGameToCMSContent(game, lookups);

  // Preserve fields from existing CMS match
  const preservedFields: Record<string, unknown> = {};
  if (existingCMSMatch) {
    const existing = existingCMSMatch.content;

    // Skip custom games entirely
    if (existing.iscustomgame === "true") {
      return { action: 'skipped' };
    }

    // Preserve SMC external IDs (critical for live data)
    if (existing.externalmatchid) preservedFields.externalmatchid = existing.externalmatchid;
    if (existing.externalleagueid) preservedFields.externalleagueid = existing.externalleagueid;

    // Preserve custom CMS content
    if (existing.lankar && Array.isArray(existing.lankar) && (existing.lankar as unknown[]).length > 0) {
      preservedFields.lankar = existing.lankar;
    }
    if (existing.salda_biljetter) preservedFields.salda_biljetter = existing.salda_biljetter;
    if (existing.maxtickets) preservedFields.maxtickets = existing.maxtickets;
    if (existing.logotyp_hemmalag) preservedFields.logotyp_hemmalag = existing.logotyp_hemmalag;
    if (existing.logotype_bortalag) preservedFields.logotype_bortalag = existing.logotype_bortalag;
    if (existing.laguppstallning_hemmalag) preservedFields.laguppstallning_hemmalag = existing.laguppstallning_hemmalag;
    if (existing.laguppstallning_bortalag) preservedFields.laguppstallning_bortalag = existing.laguppstallning_bortalag;
  }

  // Set team logos from SvFF only if CMS doesn't have them
  if (!preservedFields.logotyp_hemmalag && game.homeTeamImageUrl) {
    newContent.logotyp_hemmalag = game.homeTeamImageUrl;
  }
  if (!preservedFields.logotype_bortalag && game.awayTeamImageUrl) {
    newContent.logotype_bortalag = game.awayTeamImageUrl;
  }

  const content = {
    ...newContent,
    ...preservedFields,
  };

  const mutation = existingCMSMatch
    ? `
      mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
        updatePost(id: $id, input: $input) {
          id
          slug
          title
        }
      }
    `
    : `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          id
          slug
          title
        }
      }
    `;

  const variables = existingCMSMatch
    ? {
        id: existingCMSMatch.id,
        input: {
          title,
          content,
          status: 'published',
        },
      }
    : {
        input: {
          postTypeId: MATCHER_POST_TYPE_ID,
          title,
          slug,
          content,
          status: 'published',
        },
      };

  try {
    console.log(`📤 ${existingCMSMatch ? 'UPDATE' : 'CREATE'}: ${title}`);

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

    // CMS sometimes returns empty body on success
    if (!text || !text.trim()) {
      if (response.ok) {
        return { action: existingCMSMatch ? 'updated' : 'created' };
      }
      return {
        action: existingCMSMatch ? 'updated' : 'created',
        error: `Empty response with status ${response.status}`,
      };
    }

    const result = JSON.parse(text);

    if (result.errors) {
      console.error('🔴 GraphQL Error:', JSON.stringify(result.errors, null, 2));
      return {
        action: existingCMSMatch ? 'updated' : 'created',
        error: result.errors[0]?.message || 'Unknown GraphQL error',
      };
    }

    return { action: existingCMSMatch ? 'updated' : 'created' };
  } catch (error) {
    console.error('🔴 Fetch error:', error);
    return {
      action: existingCMSMatch ? 'updated' : 'created',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ─── fetchFromSEFAPI check ────────────────────────────────────────────────────

/** Helper to parse CMS post content */
function parseContent(post: any): Record<string, any> {
  if (typeof post.content === 'string') {
    try { return JSON.parse(post.content); } catch { return {}; }
  }
  return post.content || {};
}

/** Direct GraphQL fetch helper with pagination to fetch ALL posts */
async function fetchPostsDirect(postTypeSlug: string): Promise<any[]> {
  const PAGE_SIZE = 500;
  const allPosts: any[] = [];
  let offset = 0;

  const query = `
    query GetPosts($storeId: String!, $limit: Int, $offset: Int) {
      posts(storeId: $storeId, postTypeSlug: "${postTypeSlug}", limit: $limit, offset: $offset) {
        posts { id title slug content }
        totalCount
      }
    }
  `;

  try {
    while (true) {
      const response = await fetch(FRONTSPACE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': FRONTSPACE_STORE_ID,
          ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
        },
        body: JSON.stringify({ query, variables: { storeId: FRONTSPACE_STORE_ID, limit: PAGE_SIZE, offset } }),
      });

      const text = await response.text();
      if (!text || !text.trim()) break;
      const result = JSON.parse(text);
      const posts = result.data?.posts?.posts || [];
      allPosts.push(...posts);

      const totalCount = result.data?.posts?.totalCount ?? 0;
      offset += PAGE_SIZE;
      if (posts.length < PAGE_SIZE || offset >= totalCount) break;
    }
    return allPosts;
  } catch (error) {
    console.error(`Failed to fetch ${postTypeSlug}:`, error);
    return allPosts; // Return what we got so far
  }
}

/** Fetch lag with fetchfromsefapi enabled + build relation lookups */
async function fetchSEFTeamsAndLookups(): Promise<{
  sefTeams: Array<{ title: string; fogisTeamId?: string }>;
  lookups: RelationLookups;
}> {
  const [lagPosts, turneringarPosts] = await Promise.all([
    fetchPostsDirect('lag'),
    fetchPostsDirect('turneringar'),
  ]);

  const sefTeams: Array<{ title: string; fogisTeamId?: string }> = [];
  const lagByFogisId = new Map<string, string>();

  for (const post of lagPosts) {
    const content = parseContent(post);
    const fogisId = content.fogis_teamid || content['FOGIS-teamId'];
    const isSef = content.fetchfromsefapi === true || content.fetchfromsefapi === 'true';

    if (isSef) {
      sefTeams.push({ title: post.title, fogisTeamId: fogisId });
    }

    if (fogisId) lagByFogisId.set(String(fogisId), post.id);
  }

  // Build turneringar lookups by svff_competition_id
  // Also build competition → lag chain (turneringar has lag + fogis_team_id)
  const turneringByCompId = new Map<string, string>();
  const lagByCompId = new Map<string, { lagId: string; fogisTeamId: string }>();

  for (const post of turneringarPosts) {
    const content = parseContent(post);
    const compId = content.svff_competition_id;
    if (compId) {
      turneringByCompId.set(String(compId), post.id);

      // Chain: competition → turneringar.lag → lag post ID
      const lagId = content.lag;
      const fogisTeamId = content.fogis_team_id;
      if (lagId && fogisTeamId) {
        lagByCompId.set(String(compId), { lagId, fogisTeamId: String(fogisTeamId) });
      }
    }
  }

  // Build set of enabled FOGIS team IDs for direct game filtering
  const enabledFogisIds = new Set<string>(
    sefTeams.filter(t => t.fogisTeamId).map(t => String(t.fogisTeamId))
  );

  console.log(`👥 Lag: ${lagByFogisId.size} by FOGIS ID`);
  console.log(`🏆 Turneringar: ${turneringByCompId.size} by competition ID, ${lagByCompId.size} with lag link`);
  console.log(`✅ Enabled FOGIS team IDs: ${Array.from(enabledFogisIds).join(', ')}`);

  return {
    sefTeams,
    lookups: { lagByFogisId, turneringByCompId, lagByCompId, enabledFogisIds },
  };
}

// ─── Main Sync ───────────────────────────────────────────────────────────────

/**
 * Sync SvFF games to Frontspace CMS
 *
 * @param options.dryRun Preview only, don't create/update
 * @param options.limit Limit number of games to sync (for testing)
 * @param options.from Start date (YYYY-MM-DD)
 * @param options.to End date (YYYY-MM-DD)
 */
export async function syncSvffMatchesToCMS(
  options?: { dryRun?: boolean; limit?: number; from?: string; to?: string }
): Promise<SyncResult> {
  const { dryRun = false, limit, from, to } = options || {};
  const result: SyncResult = {
    success: false,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Check that at least one team has fetchFromSEFAPI enabled + build relation lookups
    console.log('🔄 Starting SvFF match sync...');
    const { sefTeams, lookups } = await fetchSEFTeamsAndLookups();
    if (sefTeams.length === 0) {
      result.errors.push('No teams with fetchFromSEFAPI enabled in CMS. Enable it on lag posts first.');
      return result;
    }
    console.log(`👥 ${sefTeams.length} teams with fetchFromSEFAPI enabled: ${sefTeams.map(t => t.title).join(', ')}`);

    // 2. Fetch games from SvFF
    const gamesResponse = await fetchSvFFGames(from, to);

    if (!gamesResponse || !gamesResponse.games) {
      result.errors.push('Failed to fetch games from SvFF API');
      return result;
    }

    // 3. Filter to Östers IF games only, skip canceled
    const allOstersGames = gamesResponse.games.filter(g => {
      if (g.isCanceled) return false;
      return isOstersIF(g.homeTeamName) || isOstersIF(g.awayTeamName);
    });

    console.log(`📥 ${allOstersGames.length} Östers IF games from SvFF (${gamesResponse.numberOfGames} total club games)`);

    // 3b. Filter by FOGIS team ID — only sync games where the Östers IF side
    //     matches an enabled team's homeTeamId or awayTeamId
    const filteredOut: SvFFGame[] = [];
    let games = allOstersGames.filter(g => {
      const ostersTeamId = isOstersIF(g.homeTeamName) ? g.homeTeamId : g.awayTeamId;
      if (!ostersTeamId || !lookups.enabledFogisIds.has(String(ostersTeamId))) {
        filteredOut.push(g);
        return false;
      }
      return true;
    });

    if (filteredOut.length > 0) {
      console.log(`\n⏭️ Filtered OUT ${filteredOut.length} games (team not enabled):`);
      filteredOut.forEach(g => {
        const { datum } = splitDateTime(g.timeAsDateTime);
        const teamId = isOstersIF(g.homeTeamName) ? g.homeTeamId : g.awayTeamId;
        console.log(`   ✗ ${g.homeTeamName} vs ${g.awayTeamName} (${datum}) [teamId: ${teamId || 'none'}, comp: ${g.competitionName}]`);
      });
    }

    if (limit && limit > 0 && games.length > limit) {
      console.log(`🔢 Limiting to first ${limit} games (testing mode)`);
      games = games.slice(0, limit);
    }

    if (games.length === 0) {
      console.warn('⚠️ No Östers IF games found in SvFF response');
      result.success = true;
      return result;
    }

    // Log games to sync
    console.log('\n📋 Games to sync:');
    games.forEach((g, i) => {
      const { datum, tid_for_avspark } = splitDateTime(g.timeAsDateTime);
      const status = g.isFinished ? 'FINISHED' : g.isPostponed ? 'POSTPONED' : 'UPCOMING';
      console.log(`   ${i + 1}. ${g.homeTeamName} vs ${g.awayTeamName} (${datum} ${tid_for_avspark}) [${status}] - ${g.competitionName}`);
    });

    // 3. Fetch existing CMS matches for dedup
    const existingCMSMatches = await fetchPostsDirect('matcher');
    console.log(`📦 Found ${existingCMSMatches.length} existing matches in CMS`);

    // 4. Build TWO lookup maps:
    //    - byStoredKey: match_unique_key field (fast, for matches already synced by SvFF)
    //    - byComputedKey: computed from hemmalag|bortalag|datum|time|arena (fallback for SMC matches)
    type CMSMatch = { id: string; content: Record<string, unknown> };
    const byStoredKey = new Map<string, CMSMatch>();
    const byComputedKey = new Map<string, CMSMatch>();

    for (const cmsMatch of existingCMSMatches) {
      const content = typeof cmsMatch.content === 'string'
        ? JSON.parse(cmsMatch.content)
        : cmsMatch.content || {};

      const entry: CMSMatch = { id: cmsMatch.id, content };

      // Map 1: stored match_unique_key (if previously written)
      if (content.match_unique_key) {
        byStoredKey.set(content.match_unique_key as string, entry);
      }

      // Map 2: computed from fields (fallback for older matches without stored key)
      const date = content.datum || '';
      const time = content.tid_for_avspark || '';
      const arena = content.arena || '';

      if (date) {
        const key = buildMatchKey(date, time, arena);
        byComputedKey.set(key, entry);
      }
    }

    console.log(`   🔑 ${byStoredKey.size} matches with stored key, ${byComputedKey.size} with computed key`);

    // 5. Check each game against CMS (dedup) and either preview or upsert
    result.payloads = [];
    for (const game of games) {
      const { datum, tid_for_avspark } = splitDateTime(game.timeAsDateTime);
      const key = buildMatchKey(datum, tid_for_avspark, game.venueName || '');

      // Step 1: Try stored match_unique_key (instant for already-synced matches)
      // Step 2: Fallback to computed key from fields (catches SMC matches without the key)
      const existingMatch = byStoredKey.get(key) || byComputedKey.get(key) || null;

      if (existingMatch) {
        const method = byStoredKey.has(key) ? 'stored key' : 'computed key (fallback)';
        console.log(`   🔗 Found existing match by ${method}: ${key}`);
      }

      const slug = generateSlug(game);
      const title = `${game.homeTeamName} vs ${game.awayTeamName}`;
      const newContent = transformGameToCMSContent(game, lookups);

      // DRY RUN: simulate what would happen without writing
      if (dryRun) {
        if (existingMatch) {
          const existing = existingMatch.content;
          if (existing.iscustomgame === "true") {
            result.skipped++;
            result.payloads.push({ slug, title, action: 'skip', content: newContent });
            console.log(`   ⏭️ Would SKIP (custom game): ${game.homeTeamName} vs ${game.awayTeamName}`);
          } else {
            result.updated++;
            const merged = { ...existing, ...newContent };
            result.payloads.push({ slug, title, action: 'update', content: merged });
            console.log(`   📝 Would UPDATE: ${game.homeTeamName} vs ${game.awayTeamName}`);
          }
        } else {
          result.created++;
          result.payloads.push({ slug, title, action: 'create', content: newContent });
          console.log(`   ✨ Would CREATE: ${game.homeTeamName} vs ${game.awayTeamName}`);
        }
        continue;
      }

      const { action, error } = await upsertSvffMatchToCMS(game, existingMatch, lookups);

      result.payloads.push({
        slug,
        title,
        action: action === 'created' ? 'create' : action === 'updated' ? 'update' : 'skip',
        content: newContent,
      });

      if (error) {
        const errorMsg = `Game ${game.gameId} (${game.homeTeamName} vs ${game.awayTeamName}): ${error}`;
        result.errors.push(errorMsg);
        console.error(`❌ Error: ${errorMsg}`);
      } else {
        console.log(`   ✓ ${action}: ${game.homeTeamName} vs ${game.awayTeamName}`);
      }

      switch (action) {
        case 'created': result.created++; break;
        case 'updated': result.updated++; break;
        case 'skipped': result.skipped++; break;
      }
    }

    if (dryRun) {
      console.log(`\n🔍 DRY RUN complete: ${result.created} would be created, ${result.updated} would be updated, ${result.skipped} would be skipped`);
      result.success = true;
      return result;
    }

    result.success = result.errors.length === 0;
    console.log(`\n✅ SvFF sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);

    // Revalidate cache
    if (result.created > 0 || result.updated > 0) {
      console.log('🔄 Revalidating matcher cache...');
      revalidateTag(CACHE_TAGS.MATCHER);
      revalidateTag(CACHE_TAGS.FRONTSPACE);
      revalidatePath('/matcher');
      revalidatePath('/');
      console.log('✅ Cache revalidated');
    }

    if (result.errors.length > 0) {
      console.warn(`⚠️ ${result.errors.length} errors during sync:`);
      result.errors.forEach((err, i) => console.warn(`   ${i + 1}. ${err}`));
    }
  } catch (error) {
    console.error('❌ SvFF sync failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}
