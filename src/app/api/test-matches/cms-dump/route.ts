import { NextResponse } from 'next/server';

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

function parseContent(post: any): Record<string, any> {
  if (typeof post.content === 'string') {
    try { return JSON.parse(post.content); } catch { return {}; }
  }
  return post.content || {};
}

async function fetchAllMatches(): Promise<any[]> {
  const PAGE_SIZE = 500;
  const allPosts: any[] = [];
  let offset = 0;

  const query = `
    query GetPosts($storeId: String!, $limit: Int, $offset: Int) {
      posts(storeId: $storeId, postTypeSlug: "matcher", limit: $limit, offset: $offset) {
        posts { id title slug content }
        totalCount
      }
    }
  `;

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
}

export async function GET() {
  const matches = await fetchAllMatches();

  // Parse all matches
  const parsed = matches.map(m => {
    const content = parseContent(m);
    return {
      id: m.id,
      title: m.title,
      slug: m.slug,
      hemmalag: content.hemmalag || '',
      bortalag: content.bortalag || '',
      datum: content.datum || '',
      tid: content.tid_for_avspark || '',
      arena: content.arena || '',
      leaguename: content.leaguename || '',
      sasong: content.sasong || '',
      match_status: content.match_status || '',
      svff_game_id: content.svff_game_id || '',
      match_unique_key: content.match_unique_key || '',
      fogis_team_id: content.fogis_team_id || '',
      lag: content.lag || '',
      turnering: content.turnering || '',
      externalmatchid: content.externalmatchid || '',
      iscustomgame: content.iscustomgame || '',
    };
  });

  // Stats
  const withSvffId = parsed.filter(m => m.svff_game_id);
  const withUniqueKey = parsed.filter(m => m.match_unique_key);
  const withFogisTeamId = parsed.filter(m => m.fogis_team_id);
  const withLagRelation = parsed.filter(m => m.lag);
  const withTurneringRelation = parsed.filter(m => m.turnering);
  const withExternalMatchId = parsed.filter(m => m.externalmatchid);
  const customGames = parsed.filter(m => m.iscustomgame === 'true');

  // Group by fogis_team_id
  const byFogisTeamId: Record<string, number> = {};
  for (const m of parsed) {
    const key = m.fogis_team_id || '(none)';
    byFogisTeamId[key] = (byFogisTeamId[key] || 0) + 1;
  }

  // Group by season
  const bySeason: Record<string, number> = {};
  for (const m of parsed) {
    const key = m.sasong || '(none)';
    bySeason[key] = (bySeason[key] || 0) + 1;
  }

  // Group by league
  const byLeague: Record<string, number> = {};
  for (const m of parsed) {
    const key = m.leaguename || '(none)';
    byLeague[key] = (byLeague[key] || 0) + 1;
  }

  return NextResponse.json({
    total: matches.length,
    stats: {
      withSvffGameId: withSvffId.length,
      withMatchUniqueKey: withUniqueKey.length,
      withFogisTeamId: withFogisTeamId.length,
      withLagRelation: withLagRelation.length,
      withTurneringRelation: withTurneringRelation.length,
      withExternalMatchId: withExternalMatchId.length,
      customGames: customGames.length,
    },
    byFogisTeamId,
    bySeason,
    byLeague,
    matches: parsed,
  });
}
