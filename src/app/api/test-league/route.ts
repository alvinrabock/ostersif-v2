import { NextRequest, NextResponse } from 'next/server'
import { getLeagueCache } from '@/lib/leagueCache'

const SMC_BASE_URL = 'https://smc-api.telenor.no'

/**
 * Test endpoint to check what the SMC API returns for a specific league
 * Usage: GET /api/test-league?leagueId=61
 */
export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get('leagueId')

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId parameter required' }, { status: 400 })
  }

  const apiKey = process.env.SMC_SECRET

  if (!apiKey) {
    return NextResponse.json({ error: 'SMC_SECRET not configured' }, { status: 500 })
  }

  // Get the league-specific team ID from cache
  const cache = await getLeagueCache()
  const leagueInfo = cache?.leagues.find(l => l.leagueId === leagueId)
  const ostersTeamId = leagueInfo?.ostersTeamId

  try {
    // Test fetching ALL matches for the league
    const allMatchesUrl = `${SMC_BASE_URL}/leagues/${leagueId}/matches`
    console.log(`🔍 Testing league ${leagueId}: ${allMatchesUrl}`)

    const allMatchesResponse = await fetch(allMatchesUrl, {
      headers: { 'Authorization': apiKey },
    })

    let allMatchesData: any[] = []
    try {
      allMatchesData = await allMatchesResponse.json()
    } catch (e) {
      console.error('Failed to parse all matches:', e)
    }

    // Test fetching FILTERED matches (home + away) like sync does
    let homeMatches: any[] = []
    let awayMatches: any[] = []
    let filteringWorks = false

    if (ostersTeamId) {
      // Test home matches filter
      const homeUrl = `${SMC_BASE_URL}/leagues/${leagueId}/matches?home-team-id=${ostersTeamId}`
      console.log(`🏠 Testing home filter: ${homeUrl}`)
      try {
        const homeResponse = await fetch(homeUrl, { headers: { 'Authorization': apiKey } })
        if (homeResponse.ok) {
          homeMatches = await homeResponse.json()
        }
      } catch (e) {
        console.error('Failed to fetch home matches:', e)
      }

      // Test away matches filter
      const awayUrl = `${SMC_BASE_URL}/leagues/${leagueId}/matches?away-team-id=${ostersTeamId}`
      console.log(`✈️ Testing away filter: ${awayUrl}`)
      try {
        const awayResponse = await fetch(awayUrl, { headers: { 'Authorization': apiKey } })
        if (awayResponse.ok) {
          awayMatches = await awayResponse.json()
        }
      } catch (e) {
        console.error('Failed to fetch away matches:', e)
      }

      filteringWorks = homeMatches.length > 0 || awayMatches.length > 0
    }

    // Count Östers IF matches in all data (manual filter)
    const ostersMatchesManual = Array.isArray(allMatchesData)
      ? allMatchesData.filter((m: any) =>
          m['home-team']?.toLowerCase().includes('öster') ||
          m['away-team']?.toLowerCase().includes('öster')
        )
      : []

    // Get teams for this league
    const teamsUrl = `${SMC_BASE_URL}/leagues/${leagueId}/teams`
    const teamsResponse = await fetch(teamsUrl, { headers: { 'Authorization': apiKey } })
    let teamsData: any = null
    try {
      teamsData = await teamsResponse.json()
    } catch (e) {
      console.error('Failed to parse teams:', e)
    }

    // Find Östers IF in teams list
    const ostersTeam = teamsData?.team?.find((t: any) =>
      t.name?.toLowerCase().includes('öster') ||
      t['engaging-team']?.toLowerCase().includes('öster')
    )

    return NextResponse.json({
      leagueId,
      leagueInfo: leagueInfo || 'Not found in cache',
      ostersTeamId: ostersTeamId || 'Not in cache',
      ostersTeamIdType: typeof ostersTeamId,

      allMatches: {
        url: allMatchesUrl,
        count: Array.isArray(allMatchesData) ? allMatchesData.length : 0,
      },

      filteredMatches: {
        teamIdUsed: ostersTeamId,
        homeCount: homeMatches.length,
        awayCount: awayMatches.length,
        totalFiltered: homeMatches.length + awayMatches.length,
        filteringWorks,
        sampleHome: homeMatches.slice(0, 1),
        sampleAway: awayMatches.slice(0, 1),
      },

      manualFilter: {
        ostersMatchesCount: ostersMatchesManual.length,
        sample: ostersMatchesManual.slice(0, 2),
      },

      teams: {
        count: teamsData?.team?.length || 0,
        ostersTeamInList: ostersTeam || 'Not found',
      },

      diagnosis: !filteringWorks && ostersMatchesManual.length > 0
        ? `⚠️ API filtering not working for team ID ${ostersTeamId} (type: ${typeof ostersTeamId}), but ${ostersMatchesManual.length} Östers matches exist`
        : filteringWorks
          ? `✅ Filtering works: found ${homeMatches.length} home + ${awayMatches.length} away matches`
          : '❓ No Östers IF matches found in this league',
    })
  } catch (error) {
    console.error('Test league error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        leagueId,
      },
      { status: 500 }
    )
  }
}
