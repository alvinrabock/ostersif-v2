import { NextResponse } from 'next/server'

const SMC_BASE_URL = 'https://smc-api.telenor.no'
const OSTERS_TEAM_ID = '01JVVHS4ESCV6K0GYXXB0K1NHS'
const OSTERS_EXTERNAL_ID = '25526'

interface League {
  LeagueId: string
  LeagueName: string
  StartDate: string
  EndDate: string
  tournamentID: number
}

interface Team {
  'team-id': string
  'external-id': string
  name: string
  'engaging-team': string
}

interface TeamResponse {
  team: Team[]
}

async function fetchFromSMC(endpoint: string) {
  const apiKey = process.env.SMC_SECRET

  if (!apiKey) {
    throw new Error('SMC_SECRET not configured')
  }

  const response = await fetch(`${SMC_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`SMC API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function GET() {
  try {
    console.log('🔍 Fetching all leagues with teams...')

    // Step 1: Fetch all leagues
    const leagues: League[] = await fetchFromSMC('/leagues')
    console.log(`📋 Found ${leagues.length} total leagues`)

    // Step 2: Fetch teams for each league (limit to recent years for performance)
    const currentYear = new Date().getFullYear()
    const recentLeagues = leagues.filter(league => {
      const leagueYear = new Date(league.StartDate).getFullYear()
      return leagueYear >= currentYear - 1 // Current year and last year only
    })

    console.log(`📋 Fetching teams for ${recentLeagues.length} recent leagues...`)

    const leaguesWithTeams = []

    for (const league of recentLeagues) {
      try {
        const teamsResponse: TeamResponse = await fetchFromSMC(`/leagues/${league.LeagueId}/teams`)
        const teams = teamsResponse.team || []

        // Check if Östers IF is in this league
        const hasOsters = teams.some(
          team =>
            team['team-id'] === OSTERS_TEAM_ID ||
            team['external-id'] === OSTERS_EXTERNAL_ID ||
            team.name === 'Östers IF' ||
            team.name.toLowerCase().includes('öster')
        )

        leaguesWithTeams.push({
          league,
          teams,
          hasOsters,
        })
      } catch (error) {
        console.error(`⚠️ Error fetching teams for league ${league.LeagueId}:`, error)
        leaguesWithTeams.push({
          league,
          teams: [],
          hasOsters: false,
        })
      }
    }

    // Sort by start date (newest first)
    leaguesWithTeams.sort((a, b) =>
      new Date(b.league.StartDate).getTime() - new Date(a.league.StartDate).getTime()
    )

    console.log(`✅ Fetched ${leaguesWithTeams.length} leagues with teams`)

    return NextResponse.json({
      success: true,
      data: leaguesWithTeams,
      totalLeagues: leagues.length,
      fetchedLeagues: recentLeagues.length,
    })

  } catch (error) {
    console.error('❌ Error fetching leagues:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
