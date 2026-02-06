/**
 * Debug endpoint to check upcoming matches sorting from Frontspace API
 * GET /api/debug/upcoming-matches - shows filtered upcoming matches
 * GET /api/debug/upcoming-matches?all=true - shows ALL matches without filters
 *
 * This helps verify if the backend sorting fix is working in production
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { fetchUpcomingMatchesCached, fetchPosts } from '@/lib/frontspace/client';
import type { MatcherPost } from '@/lib/frontspace/types';

export async function GET(request: NextRequest) {
  try {
    const showAll = request.nextUrl.searchParams.get('all') === 'true';

    let cmsMatches: MatcherPost[] = [];
    let total = 0;

    if (showAll) {
      // Fetch ALL matcher posts without any filters
      const result = await fetchPosts<MatcherPost>('matcher', {
        limit: 50,
        sortBy: 'datum',
        sortDirection: 'asc',
      });
      cmsMatches = result.posts;
      total = result.total;
    } else {
      // Use the filtered function
      const result = await fetchUpcomingMatchesCached(20);
      cmsMatches = result.posts;
      total = result.total;
    }

    // Extract just the relevant data for debugging
    const matchData = cmsMatches?.map((m, index) => {
      const raw = m as any;
      const content = typeof raw.content === 'string' ? JSON.parse(raw.content) : raw.content;

      return {
        index,
        title: m.title,
        slug: m.slug,
        datum: content?.datum,
        kickoff: content?.kickoff_tid,
        homeTeam: content?.hemmalag_namn,
        awayTeam: content?.bortalag_namn,
        status: content?.match_status,
        liga: content?.liga_namn,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      total,
      filtered: !showAll,
      message: showAll
        ? 'ALL matches from CMS (no filters)'
        : 'Filtered upcoming matches (datum >= today, status != over)',
      matches: matchData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
