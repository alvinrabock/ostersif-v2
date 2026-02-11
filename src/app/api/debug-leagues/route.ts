/**
 * Debug endpoint to show league cache and match counts
 * Helps diagnose why certain leagues (e.g., Svenska Cupen) might not be syncing
 */

import { NextResponse } from 'next/server';
import { getLeagueCache } from '@/lib/leagueCache';
import { getMatches } from '@/lib/fetchMatches';

export const dynamic = 'force-dynamic';

interface LeagueDebugInfo {
  leagueId: string;
  leagueName: string;
  seasonYear: string;
  ostersTeamId?: string;
  matchCount: number;
  error?: string;
  sampleMatches?: Array<{ homeTeam: string; awayTeam: string; kickoff: string }>;
}

export async function GET() {
  try {
    console.log('🔍 Debug: Checking league cache and match counts...\n');

    // 1. Get league cache
    const cache = await getLeagueCache();

    if (!cache) {
      return NextResponse.json({
        success: false,
        error: 'League cache is empty. Run "Refresh Cache" at /admin/matcher first.',
      });
    }

    console.log(`📋 League cache has ${cache.leagues.length} leagues`);
    console.log(`🏟️ Team ID: ${cache.teamId}`);
    console.log(`📅 Last updated: ${cache.lastUpdated}\n`);

    // 2. Check each league individually
    const leagueDebugInfo: LeagueDebugInfo[] = [];

    for (const league of cache.leagues) {
      console.log(`\n🔍 Checking: ${league.leagueName} (${league.seasonYear})`);
      console.log(`   League ID: ${league.leagueId}`);
      console.log(`   Team ID: ${league.ostersTeamId || 'NOT SET'}`);

      try {
        // Fetch matches for this specific league
        const matches = await getMatches([league.leagueId], cache.teamId);

        console.log(`   ✅ Found ${matches.length} matches`);

        // Get sample matches (first 3)
        const sampleMatches = matches.slice(0, 3).map(m => ({
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoff: m.kickoff,
        }));

        if (matches.length > 0) {
          console.log(`   Sample matches:`);
          sampleMatches.forEach(m => {
            console.log(`     - ${m.homeTeam} vs ${m.awayTeam} (${m.kickoff})`);
          });
        }

        leagueDebugInfo.push({
          leagueId: league.leagueId,
          leagueName: league.leagueName,
          seasonYear: league.seasonYear,
          ostersTeamId: league.ostersTeamId,
          matchCount: matches.length,
          sampleMatches: matches.length > 0 ? sampleMatches : undefined,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(`   ❌ Error: ${errorMsg}`);

        leagueDebugInfo.push({
          leagueId: league.leagueId,
          leagueName: league.leagueName,
          seasonYear: league.seasonYear,
          ostersTeamId: league.ostersTeamId,
          matchCount: 0,
          error: errorMsg,
        });
      }
    }

    // 3. Summary
    const leaguesWithMatches = leagueDebugInfo.filter(l => l.matchCount > 0);
    const leaguesWithoutMatches = leagueDebugInfo.filter(l => l.matchCount === 0);
    const totalMatches = leagueDebugInfo.reduce((sum, l) => sum + l.matchCount, 0);

    console.log('\n📊 SUMMARY:');
    console.log(`   Total leagues: ${leagueDebugInfo.length}`);
    console.log(`   Leagues with matches: ${leaguesWithMatches.length}`);
    console.log(`   Leagues without matches: ${leaguesWithoutMatches.length}`);
    console.log(`   Total matches: ${totalMatches}`);

    // Check specifically for Svenska Cupen
    const svenskaCupen = leagueDebugInfo.find(l =>
      l.leagueName.toLowerCase().includes('cupen') ||
      l.leagueName.toLowerCase().includes('cup')
    );

    if (svenskaCupen) {
      console.log(`\n🏆 SVENSKA CUPEN STATUS:`);
      console.log(`   League: ${svenskaCupen.leagueName}`);
      console.log(`   Team ID: ${svenskaCupen.ostersTeamId || 'NOT SET'}`);
      console.log(`   Match count: ${svenskaCupen.matchCount}`);
      if (svenskaCupen.error) {
        console.log(`   Error: ${svenskaCupen.error}`);
      }
    } else {
      console.log(`\n⚠️  No "Cup" league found in cache. Run "Refresh Cache" to discover new leagues.`);
    }

    return NextResponse.json({
      success: true,
      cache: {
        teamId: cache.teamId,
        teamName: cache.teamName,
        lastUpdated: cache.lastUpdated,
        totalLeagues: cache.leagues.length,
      },
      leagues: leagueDebugInfo,
      summary: {
        totalLeagues: leagueDebugInfo.length,
        leaguesWithMatches: leaguesWithMatches.length,
        leaguesWithoutMatches: leaguesWithoutMatches.length,
        totalMatches,
      },
      svenskaCupen: svenskaCupen || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
