/**
 * Debug endpoint to check upcoming matches sorting from Frontspace API
 * GET /api/debug/upcoming-matches
 *
 * This helps verify if the backend sorting fix is working in production
 */

import { NextResponse } from 'next/server';
import { fetchUpcomingMatchesCached } from '@/lib/frontspace/client';

export async function GET() {
  try {
    const { posts: cmsMatches, totalCount } = await fetchUpcomingMatchesCached(10);

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
      };
    }) || [];

    return NextResponse.json({
      success: true,
      totalCount,
      message: 'Raw order from API - check if sorted by datum ascending',
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
