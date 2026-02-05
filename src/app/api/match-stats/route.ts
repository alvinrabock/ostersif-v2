import { NextResponse } from 'next/server'
import { frontspace } from '@/lib/frontspace/client'

interface MatchStats {
  totalMatches: number
  bySeason: Record<string, number>
  byLeague: Record<string, { count: number; leagueName: string }>
}

export async function GET() {
  try {
    // Fetch all matches from CMS
    const { posts: cmsMatches } = await frontspace.matcher.getAll({ limit: 1000 }) as { posts: any[]; total: number }

    const stats: MatchStats = {
      totalMatches: cmsMatches.length,
      bySeason: {},
      byLeague: {},
    }

    // Count matches by season and league
    for (const match of cmsMatches) {
      const content = typeof match.content === 'string'
        ? JSON.parse(match.content)
        : match.content || {}

      // Count by season
      const season = content.sasong || 'Unknown'
      stats.bySeason[season] = (stats.bySeason[season] || 0) + 1

      // Count by league
      const leagueId = content.externalleagueid || 'custom'
      const leagueName = content.leaguename || 'Custom/Unknown'
      if (!stats.byLeague[leagueId]) {
        stats.byLeague[leagueId] = { count: 0, leagueName }
      }
      stats.byLeague[leagueId].count++
    }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching match stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
