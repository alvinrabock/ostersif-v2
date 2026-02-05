"use server";

/**
 * Match Sync Logic - SMC API → Frontspace CMS
 *
 * This module handles syncing match data from the external SMC API
 * to Frontspace CMS for the CMS-first architecture.
 *
 * Sync Strategy:
 * 1. Fetch all matches from SMC API
 * 2. Fetch existing matches from CMS to preserve custom fields
 * 3. Upsert matches to CMS (create new, update existing)
 * 4. Skip custom games (isCustomGame: true)
 */

import { getMatches as fetchMatchesFromSMC } from "./fetchMatches";
import { frontspace, CACHE_TAGS } from "./frontspace/client";
import { getLeagueCache } from "./leagueCache";
import { MatchCardData } from "@/types";
import { revalidateTag, revalidatePath } from "next/cache";

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

// The matcher post type ID in Frontspace
const MATCHER_POST_TYPE_ID = '5e8b21d9-5c7a-4919-8dc2-0ccde6108964';

function getMatcherPostTypeId(): string {
  return MATCHER_POST_TYPE_ID;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  timestamp: string;
}

/**
 * Split ISO datetime into date and time parts
 */
function splitDateTime(kickoff: string): { datum: string; tid_for_avspark: string } {
  if (!kickoff) return { datum: '', tid_for_avspark: '' };

  const date = new Date(kickoff);
  const datum = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const tid_for_avspark = date.toTimeString().slice(0, 5); // HH:mm

  return { datum, tid_for_avspark };
}

/**
 * Map SMC status to CMS select field value
 * CMS uses lowercase: "scheduled", "in-progress", "over"
 */
function mapMatchStatus(smcStatus: string): string {
  const statusMap: Record<string, string> = {
    // SMC values → CMS select values (lowercase to match iscustomgame pattern)
    'Scheduled': 'scheduled',
    'scheduled': 'scheduled',
    'In progress': 'in-progress',
    'in progress': 'in-progress',
    'in-progress': 'in-progress',
    'InProgress': 'in-progress',
    'Live': 'in-progress',
    'live': 'in-progress',
    'Over': 'over',
    'over': 'over',
    'Finished': 'over',
    'finished': 'over',
    'FT': 'over',
  };

  return statusMap[smcStatus] || smcStatus.toLowerCase();
}

/**
 * Transform SMC match data to CMS content format
 * Uses Swedish field names matching the CMS schema
 * @param match - Match data from SMC API
 * @param leagueName - League name from cache (optional)
 */
function transformMatchToCMSContent(match: MatchCardData, leagueName?: string): Record<string, any> {
  const { datum, tid_for_avspark } = splitDateTime(match.kickoff);

  // Derive season from kickoff date (Swedish football uses single-year seasons)
  const sasong = match.kickoff ? new Date(match.kickoff).getFullYear().toString() : '';

  return {
    // External IDs for sync tracking
    externalmatchid: String(match.matchId),
    externalleagueid: String(match.leagueId),

    // Team names
    hemmalag: match.homeTeam,
    bortalag: match.awayTeam,

    // Schedule (split into date and time)
    datum,
    tid_for_avspark,
    arena: match.arenaName || '',

    // Result
    match_status: mapMatchStatus(match.status),  // Select field: scheduled, in-progress, over
    mal_hemmalag: match.goalsHome ?? 0,
    mal_bortalag: match.goalsAway ?? 0,

    // League & Season
    leaguename: leagueName || '',
    sasong,

    // Meta
    iscustomgame: "false",  // Select field, not boolean
    lastsyncedat: new Date().toISOString(),
  };
}

/**
 * Generate a URL-safe slug from match data
 */
function generateMatchSlug(match: MatchCardData): string {
  const date = new Date(match.kickoff).toISOString().split('T')[0]; // YYYY-MM-DD
  const homeSafe = match.homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const awaySafe = match.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  return `${date}-${homeSafe}-vs-${awaySafe}`;
}

/**
 * Create or update a match in Frontspace CMS
 * @param postTypeId - Required for creating new posts
 * @param leagueName - League name from cache
 */
async function upsertMatchToCMS(
  match: MatchCardData,
  existingCMSMatch: any | null,
  postTypeId: string,
  leagueName?: string
): Promise<{ action: 'created' | 'updated' | 'skipped'; error?: string }> {
  const slug = generateMatchSlug(match);
  const title = `${match.homeTeam} vs ${match.awayTeam}`;

  // Preserve custom fields from existing CMS match (Swedish field names)
  const preservedFields: Record<string, any> = {};
  if (existingCMSMatch) {
    const existingContent = typeof existingCMSMatch.content === 'string'
      ? JSON.parse(existingCMSMatch.content)
      : existingCMSMatch.content || {};

    // Only preserve custom fields if they were set in CMS
    // Links (lankar repeater) - preserve entire array
    if (existingContent.lankar && existingContent.lankar.length > 0) {
      preservedFields.lankar = existingContent.lankar;
    }
    // Ticket info
    if (existingContent.salda_biljetter) preservedFields.salda_biljetter = existingContent.salda_biljetter;
    if (existingContent.maxtickets) preservedFields.maxtickets = existingContent.maxtickets;
    // Custom logo overrides for special matches
    if (existingContent.logotyp_hemmalag) preservedFields.logotyp_hemmalag = existingContent.logotyp_hemmalag;
    if (existingContent.logotype_bortalag) preservedFields.logotype_bortalag = existingContent.logotype_bortalag;
    // Lineup overrides (if manually set)
    if (existingContent.laguppstallning_hemmalag) preservedFields.laguppstallning_hemmalag = existingContent.laguppstallning_hemmalag;
    if (existingContent.laguppstallning_bortalag) preservedFields.laguppstallning_bortalag = existingContent.laguppstallning_bortalag;

    // Skip if it's a custom game (don't overwrite with SMC data)
    if (existingContent.iscustomgame === "true") {
      return { action: 'skipped' };
    }
  }

  const content = {
    ...transformMatchToCMSContent(match, leagueName),
    ...preservedFields, // Merge preserved custom fields
  };

  // GraphQL mutation for creating/updating a post
  // Note: storeId is passed via x-store-id header, not as mutation argument
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
        id: existingCMSMatch.id,  // Use 'id' not 'postId'
        input: {
          title,
          content, // Send as object, not JSON string
          status: 'published',
        },
      }
    : {
        input: {
          postTypeId, // Required for creating new posts
          title,
          slug,
          content, // Send as object, not JSON string
          status: 'published',
        },
      };

  try {
    const requestBody = { query: mutation, variables };

    // Log the content being sent for debugging
    console.log(`📤 ${existingCMSMatch ? 'UPDATE' : 'CREATE'}: ${title}`);
    console.log('   Content:', JSON.stringify(content, null, 2));

    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': FRONTSPACE_STORE_ID,
        ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (result.errors) {
      // Log full error details for debugging
      console.error('🔴 GraphQL Error:', JSON.stringify(result.errors, null, 2));
      console.error('🔴 Variables sent:', JSON.stringify(variables, null, 2));

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

/**
 * Main sync function - fetches from SMC and upserts to CMS
 * @param leagueIds Optional array of specific league IDs to sync. If not provided, syncs all leagues from cache.
 * @param seasonYear Optional season year to filter leagues (e.g., "2025"). Use "all" to sync ALL seasons. If not provided, syncs current season.
 * @param options.dryRun If true, only preview what would be synced without actually creating/updating.
 * @param options.limit Limit the number of matches to sync (useful for testing).
 */
export async function syncMatchesToCMS(
  leagueIds?: string[],
  seasonYear?: string,
  options?: { dryRun?: boolean; limit?: number }
): Promise<SyncResult> {
  const { dryRun = false, limit } = options || {};
  const result: SyncResult = {
    success: false,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Get league IDs from cache if not provided
  let targetLeagueIds = leagueIds;

  if (!targetLeagueIds || targetLeagueIds.length === 0) {
    const cache = await getLeagueCache();

    if (!cache || cache.leagues.length === 0) {
      result.errors.push('League cache is empty. Please refresh the cache first at /admin/matcher');
      console.error('❌ League cache is empty - cannot sync');
      return result;
    }

    // Special case: "all" syncs ALL seasons
    if (seasonYear === 'all') {
      targetLeagueIds = cache.leagues.map(l => l.leagueId);
      const availableSeasons = [...new Set(cache.leagues.map(l => l.seasonYear))].sort().reverse();
      console.log(`📋 Syncing ALL ${targetLeagueIds.length} leagues across ${availableSeasons.length} seasons: ${availableSeasons.join(', ')}`);
      cache.leagues.forEach(l => console.log(`   - ${l.leagueName} (${l.leagueId}) - ${l.seasonYear}`));
    } else {
      // Filter by season if specified, otherwise use current season
      const targetSeason = seasonYear || new Date().getFullYear().toString();
      const leaguesForSeason = cache.leagues.filter(l => l.seasonYear === targetSeason);

      if (leaguesForSeason.length === 0) {
        result.errors.push(`No leagues found for season ${targetSeason}. Available seasons: ${[...new Set(cache.leagues.map(l => l.seasonYear))].join(', ')}`);
        console.error(`❌ No leagues found for season ${targetSeason}`);
        return result;
      }

      targetLeagueIds = leaguesForSeason.map(l => l.leagueId);
      console.log(`📋 Using ${targetLeagueIds.length} leagues from cache for season ${targetSeason}:`);
      leaguesForSeason.forEach(l => console.log(`   - ${l.leagueName} (${l.leagueId})`));
    }
  }

  try {
    console.log(`🔄 Starting match sync for leagues: ${targetLeagueIds.join(', ')}`);

    // 0. Get the matcher post type ID (REQUIRED for creating posts)
    const postTypeId = getMatcherPostTypeId();

    // Get teamId from cache to filter only Östers IF matches
    const cache = await getLeagueCache();
    const teamId = cache?.teamId;

    if (!teamId) {
      console.warn('⚠️ No teamId in cache - will sync ALL matches (not filtered to Östers IF)');
    } else {
      console.log(`🏟️ Filtering matches to only Östers IF (teamId: ${teamId})`);
    }

    // Build leagueId → league info map from cache for logging
    const leagueInfoMap = new Map<string, { name: string; season: string }>();
    if (cache) {
      for (const league of cache.leagues) {
        leagueInfoMap.set(league.leagueId, {
          name: league.leagueName,
          season: league.seasonYear
        });
      }
    }

    // 1. Fetch matches from SMC API per league to see which leagues return data
    console.log('\n📡 Fetching matches per league:');
    let smcMatches: MatchCardData[] = [];

    for (const leagueId of targetLeagueIds) {
      const leagueInfo = leagueInfoMap.get(leagueId);
      const leagueLabel = leagueInfo
        ? `${leagueInfo.name} ${leagueInfo.season}`
        : `League ${leagueId}`;

      try {
        const leagueMatches = await fetchMatchesFromSMC([leagueId], teamId);
        console.log(`   ✅ ${leagueLabel}: ${leagueMatches.length} matches`);
        smcMatches.push(...leagueMatches);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ ${leagueLabel}: FAILED - ${errorMsg}`);
        result.errors.push(`Failed to fetch ${leagueLabel}: ${errorMsg}`);
      }
    }

    // Deduplicate matches by matchId (in case of overlaps)
    const uniqueMatches = new Map<number, MatchCardData>();
    for (const match of smcMatches) {
      uniqueMatches.set(match.matchId, match);
    }
    smcMatches = Array.from(uniqueMatches.values());

    console.log(`\n📥 Total: ${smcMatches.length} unique Östers IF matches from SMC API`);

    // Apply limit if specified (for testing)
    if (limit && limit > 0 && smcMatches.length > limit) {
      console.log(`🔢 Limiting to first ${limit} matches (testing mode)`);
      smcMatches = smcMatches.slice(0, limit);
    }

    if (smcMatches.length === 0) {
      console.warn('⚠️ No matches returned from SMC API');
      result.success = true;
      return result;
    }

    // Log match details for verification
    console.log('\n📋 Matches to sync:');
    smcMatches.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.kickoff}) - ID: ${m.matchId}`);
    });

    // DRY RUN: Just preview, don't actually sync
    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      result.success = true;
      result.created = smcMatches.length; // Show how many would be created
      console.log(`✅ Dry run complete: Would sync ${smcMatches.length} matches`);
      return result;
    }

    // 2. Fetch existing matches from CMS for comparison
    const { posts: existingCMSMatches } = await frontspace.matcher.getAll({ limit: 500 }) as { posts: any[]; total: number };
    console.log(`📦 Found ${existingCMSMatches.length} existing matches in CMS`);

    // Build lookup map by externalmatchid (Swedish field name)
    const cmsMatchMap = new Map<string, any>();
    for (const cmsMatch of existingCMSMatches) {
      const content = typeof cmsMatch.content === 'string'
        ? JSON.parse(cmsMatch.content)
        : cmsMatch.content || {};
      if (content.externalmatchid) {
        cmsMatchMap.set(content.externalmatchid, cmsMatch);
      }
    }

    // Build leagueId → leagueName map from cache
    const leagueNameMap = new Map<string, string>();
    if (cache) {
      for (const league of cache.leagues) {
        leagueNameMap.set(league.leagueId, league.leagueName);
      }
    }

    // 3. Upsert each match
    for (const match of smcMatches) {
      const externalMatchId = String(match.matchId);
      const existingCMSMatch = cmsMatchMap.get(externalMatchId);
      const leagueName = leagueNameMap.get(String(match.leagueId));

      const { action, error } = await upsertMatchToCMS(match, existingCMSMatch, postTypeId, leagueName);

      if (error) {
        const errorMsg = `Match ${externalMatchId} (${match.homeTeam} vs ${match.awayTeam}): ${error}`;
        result.errors.push(errorMsg);
        console.error(`❌ Error: ${errorMsg}`);
      } else {
        console.log(`   ✓ ${action}: ${match.homeTeam} vs ${match.awayTeam}`);
      }

      switch (action) {
        case 'created':
          result.created++;
          break;
        case 'updated':
          result.updated++;
          break;
        case 'skipped':
          result.skipped++;
          break;
      }
    }

    result.success = result.errors.length === 0;
    console.log(`✅ Sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);

    // Revalidate cache so frontend shows fresh data
    if (result.created > 0 || result.updated > 0) {
      console.log('🔄 Revalidating matcher cache...');
      // Revalidate tags (for unstable_cache and fetch cache)
      revalidateTag(CACHE_TAGS.MATCHER);
      revalidateTag(CACHE_TAGS.FRONTSPACE);
      // Revalidate paths (for Full Route Cache)
      revalidatePath('/matcher');
      revalidatePath('/');
      console.log('✅ Cache revalidated (tags + paths)');
    }

    if (result.errors.length > 0) {
      console.warn(`⚠️ ${result.errors.length} errors during sync:`);
      result.errors.forEach((err, i) => console.warn(`   ${i + 1}. ${err}`));
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Sync a single match by external ID (for webhook triggers)
 */
export async function syncSingleMatch(externalMatchId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the matcher post type ID
    const postTypeId = getMatcherPostTypeId();

    // Get league IDs and teamId from cache
    const cache = await getLeagueCache();
    if (!cache || cache.leagues.length === 0) {
      return { success: false, error: 'League cache is empty. Please refresh the cache first.' };
    }

    const currentSeason = new Date().getFullYear().toString();
    const leagueIds = cache.leagues
      .filter(l => l.seasonYear === currentSeason)
      .map(l => l.leagueId);

    // Use teamId to filter to only Östers IF matches
    const teamId = cache.teamId;

    // Fetch only Östers IF matches from SMC
    const allMatches = await fetchMatchesFromSMC(leagueIds, teamId);
    const match = allMatches.find(m => String(m.matchId) === externalMatchId);

    if (!match) {
      return { success: false, error: 'Match not found in SMC API' };
    }

    // Check if it exists in CMS
    const existingCMSMatch = await frontspace.matcher.getByExternalId(externalMatchId);

    // Look up league name from cache
    const leagueName = cache.leagues.find(l => l.leagueId === String(match.leagueId))?.leagueName;

    const { action, error } = await upsertMatchToCMS(match, existingCMSMatch, postTypeId, leagueName);

    if (error) {
      return { success: false, error };
    }

    console.log(`✅ Single match sync complete: ${action}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Östers IF team name variations for matching
 */
const OSTERS_IF_NAMES = ['östers if', 'öster', 'östers', 'osters if', 'osters'];

/**
 * Check if a team name is Östers IF
 */
function isOstersIF(teamName: string): boolean {
  const normalized = teamName.toLowerCase().trim();
  return OSTERS_IF_NAMES.some(name => normalized.includes(name));
}

interface PreviewResult {
  success: boolean;
  toDelete: Array<{ id: string; title: string; homeTeam: string; awayTeam: string; datum: string }>;
  toKeep: Array<{ id: string; title: string; homeTeam: string; awayTeam: string; datum: string }>;
  timestamp: string;
}

/**
 * Preview which matches would be deleted (non-Östers IF matches)
 * This is a READ-ONLY operation - no data is deleted
 * Use this to review before manually deleting in Frontspace CMS admin or database
 */
export async function previewNonOstersMatches(): Promise<PreviewResult> {
  const result: PreviewResult = {
    success: false,
    toDelete: [],
    toKeep: [],
    timestamp: new Date().toISOString(),
  };

  try {
    console.log('🔍 Previewing non-Östers IF matches (read-only)...');

    // Fetch all matches from CMS
    const { posts: cmsMatches } = await frontspace.matcher.getAll({ limit: 1000 }) as { posts: any[]; total: number };
    console.log(`📦 Found ${cmsMatches.length} total matches in CMS`);

    if (cmsMatches.length === 0) {
      result.success = true;
      console.log('✅ No matches in CMS');
      return result;
    }

    // Categorize matches
    for (const cmsMatch of cmsMatches) {
      const content = typeof cmsMatch.content === 'string'
        ? JSON.parse(cmsMatch.content)
        : cmsMatch.content || {};

      const homeTeam = content.hemmalag || '';
      const awayTeam = content.bortalag || '';
      const datum = content.datum || '';

      const matchInfo = {
        id: cmsMatch.id,
        title: cmsMatch.title || `${homeTeam} vs ${awayTeam}`,
        homeTeam,
        awayTeam,
        datum,
      };

      const isOstersMatch = isOstersIF(homeTeam) || isOstersIF(awayTeam);

      if (isOstersMatch) {
        result.toKeep.push(matchInfo);
      } else {
        result.toDelete.push(matchInfo);
      }
    }

    result.success = true;
    console.log(`🏟️ Would keep: ${result.toKeep.length} Östers IF matches`);
    console.log(`🗑️ Would delete: ${result.toDelete.length} non-Östers IF matches`);

    // Log the matches that would be deleted for review
    if (result.toDelete.length > 0) {
      console.log('\n📋 Matches to delete (copy IDs for manual deletion):');
      result.toDelete.forEach(m => {
        console.log(`   ID: ${m.id} | ${m.datum} | ${m.homeTeam} vs ${m.awayTeam}`);
      });
    }

  } catch (error) {
    console.error('❌ Preview failed:', error);
  }

  return result;
}
