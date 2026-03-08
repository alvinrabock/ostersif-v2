"use server";

/**
 * Tournament/League Sync Logic - SMC API → Frontspace CMS
 *
 * Syncs league/tournament data from the SMC API to the "Turneringar" post type
 */

import { getLeagueCache } from "./leagueCache";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./frontspace/client";

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

// The turneringar post type ID in Frontspace
const TURNERINGAR_POST_TYPE_ID = 'f73c99ff-7812-4310-9b1a-d43ba019e54e';

interface LeagueData {
  leagueId: string;
  leagueName: string;
  startDate: string;
  endDate: string;
  tournamentId: number;
  seasonYear: string;
  ostersTeamId?: string;
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
 * Transform league data to CMS content format
 */
function transformLeagueToCMSContent(league: LeagueData): Record<string, any> {
  return {
    // External IDs for sync tracking
    externalleagueid: league.leagueId,
    tournamentid: league.tournamentId,

    // Dates
    startdatum: league.startDate.split('T')[0], // Ensure YYYY-MM-DD format
    slutdatum: league.endDate.split('T')[0],

    // Season
    sasong: league.seasonYear,

    // Östers IF team ID in this league
    ostersteamid: league.ostersTeamId || '',

    // Sync tracking
    lastsyncedat: new Date().toISOString(),
  };
}

/**
 * Generate a URL-safe slug from league data
 */
function generateLeagueSlug(league: LeagueData): string {
  const nameSafe = league.leagueName
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${league.seasonYear}-${nameSafe}`;
}

/**
 * Fetch existing turneringar from CMS
 */
async function fetchExistingTurneringar(): Promise<Map<string, any>> {
  const query = `
    query GetTurneringar($storeId: String!, $limit: Int) {
      posts(storeId: $storeId, postTypeSlug: "turneringar", limit: $limit) {
        posts {
          id
          title
          slug
          content
          status
        }
        totalCount
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
      body: JSON.stringify({ query, variables: { storeId: FRONTSPACE_STORE_ID, limit: 500 } }),
    });

    const result = await response.json();

    // Check for REST-style auth error
    if (result.error) {
      console.error('API Error fetching turneringar:', result.error);
      return new Map();
    }

    if (result.errors) {
      console.error('GraphQL Error fetching turneringar:', result.errors);
      return new Map();
    }

    const posts = result.data?.posts?.posts || [];
    const map = new Map<string, any>();

    for (const post of posts) {
      const content = typeof post.content === 'string' ? JSON.parse(post.content) : post.content || {};
      if (content.externalleagueid) {
        map.set(content.externalleagueid, post);
      }
    }

    return map;
  } catch (error) {
    console.error('Error fetching existing turneringar:', error);
    return new Map();
  }
}

/**
 * Create or update a league in Frontspace CMS
 */
async function upsertLeagueToCMS(
  league: LeagueData,
  existingPost: any | null
): Promise<{ action: 'created' | 'updated' | 'skipped'; error?: string }> {
  const slug = generateLeagueSlug(league);
  const title = league.leagueName;
  const content = transformLeagueToCMSContent(league);

  const mutation = existingPost
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

  const variables = existingPost
    ? {
        id: existingPost.id,
        input: {
          title,
          content,
          status: 'published',
        },
      }
    : {
        input: {
          postTypeId: TURNERINGAR_POST_TYPE_ID,
          title,
          slug,
          content,
          status: 'published',
        },
      };

  try {
    console.log(`📤 ${existingPost ? 'UPDATE' : 'CREATE'}: ${title}`);
    console.log('   Content:', JSON.stringify(content, null, 2));

    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-store-id': FRONTSPACE_STORE_ID,
        ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const result = await response.json();

    // Check for REST-style error (e.g., { error: "Unauthorized", status: 401 })
    if (result.error) {
      console.error('API Error:', result.error);
      return {
        action: existingPost ? 'updated' : 'created',
        error: `API Error: ${result.error}`,
      };
    }

    // Check for GraphQL-style errors
    if (result.errors) {
      console.error('GraphQL Error:', JSON.stringify(result.errors, null, 2));
      return {
        action: existingPost ? 'updated' : 'created',
        error: result.errors[0]?.message || 'Unknown GraphQL error',
      };
    }

    // Verify we actually got data back
    const mutationResult = result.data?.createPost || result.data?.updatePost;
    if (!mutationResult) {
      console.error('No data returned from mutation:', JSON.stringify(result, null, 2));
      return {
        action: existingPost ? 'updated' : 'created',
        error: 'No data returned from CMS mutation',
      };
    }

    console.log(`   ✅ Success: ${mutationResult.id}`);
    return { action: existingPost ? 'updated' : 'created' };
  } catch (error) {
    console.error('Fetch error:', error);
    return {
      action: existingPost ? 'updated' : 'created',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main sync function - syncs leagues from cache to CMS
 * @param options.dryRun If true, only preview what would be synced
 * @param options.limit Limit the number of leagues to sync
 * @param options.season Filter by season (e.g., "2025")
 */
export async function syncTurneringarToCMS(
  options?: { dryRun?: boolean; limit?: number; season?: string }
): Promise<SyncResult> {
  const { dryRun = false, limit, season } = options || {};
  const result: SyncResult = {
    success: false,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    console.log('🔄 Starting turneringar sync...');

    // Get leagues from cache
    const cache = await getLeagueCache();

    if (!cache || cache.leagues.length === 0) {
      result.errors.push('League cache is empty. Please refresh the cache first at /admin/matcher');
      console.error('❌ League cache is empty');
      return result;
    }

    // Filter leagues
    let leagues = cache.leagues;

    if (season && season !== 'all') {
      leagues = leagues.filter(l => l.seasonYear === season);
      console.log(`📋 Filtered to ${leagues.length} leagues for season ${season}`);
    }

    if (limit && limit > 0) {
      leagues = leagues.slice(0, limit);
      console.log(`📋 Limited to ${leagues.length} leagues`);
    }

    console.log(`📋 Processing ${leagues.length} leagues:`);
    leagues.forEach(l => console.log(`   - ${l.leagueName} (${l.seasonYear})`));

    if (leagues.length === 0) {
      result.success = true;
      console.log('⚠️ No leagues to sync');
      return result;
    }

    // DRY RUN
    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      result.success = true;
      result.created = leagues.length;
      console.log(`✅ Dry run complete: Would sync ${leagues.length} leagues`);
      return result;
    }

    // Fetch existing turneringar from CMS
    const existingMap = await fetchExistingTurneringar();
    console.log(`📦 Found ${existingMap.size} existing turneringar in CMS`);

    // Upsert each league
    for (const league of leagues) {
      const existingPost = existingMap.get(league.leagueId);
      const { action, error } = await upsertLeagueToCMS(league, existingPost);

      if (error) {
        result.errors.push(`${league.leagueName}: ${error}`);
        console.error(`❌ Error: ${league.leagueName}: ${error}`);
      } else {
        console.log(`   ✓ ${action}: ${league.leagueName}`);
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

    // Revalidate cache
    if (result.created > 0 || result.updated > 0) {
      console.log('🔄 Revalidating turneringar cache...');
      revalidateTag('turneringar');
      revalidateTag(CACHE_TAGS.FRONTSPACE);
      console.log('✅ Cache revalidated');
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}
