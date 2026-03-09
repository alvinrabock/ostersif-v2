"use server"

const SVFF_BASE_URL = 'https://forening-api.svenskfotboll.se'

export interface SvFFStandingTeam {
  position: number
  teamName: string
  teamImageUrl?: string
  games: number
  wins: number
  draws: number
  losses: number
  goalsScored: number
  goalsConceded: number
  goalDifferential: number
  points: number
  promoted?: boolean
  relegated?: boolean
}

export interface SvFFStandingsExtended {
  competitionId: number
  competitionName: string
  seasonName?: string
  teamsPromoted?: number
  teamsRelegated?: number
  teamEngagements: SvFFStandingTeam[]
}

export interface SvFFTeamEngagement {
  teamEngagementId: number
  competitionName: string
  competitionStatus?: string
  seasonId?: number
  competition?: {
    competitionId: number
    name: string
    seasonId: number
    categoryName?: string
    ageCategoryName?: string
    genderName?: string
    footballTypeName?: string
    statusName?: string
  }
  standingsExtended?: SvFFStandingsExtended
}

export interface SvFFTeamStandingsResponse {
  team: {
    teamId: number
    name: string
    teamEngagementsWithStandings: SvFFTeamEngagement[]
  }
}

/**
 * Fetch team standings from SvFF API
 * Returns all competitions the team participates in with full standings
 */
export async function fetchSvFFTeamStandings(teamId: string): Promise<SvFFTeamStandingsResponse | null> {
  const apiKey = process.env.SVFF_API_KEY
  if (!apiKey) {
    console.error('[SvFF] SVFF_API_KEY not configured')
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${SVFF_BASE_URL}/club/team-standings/${teamId}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'ApiKey': apiKey,
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[SvFF] API error: ${response.status} for teamId ${teamId}`)
      return null
    }

    const data: SvFFTeamStandingsResponse = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[SvFF] Timeout fetching standings for teamId ${teamId}`)
    } else {
      console.error(`[SvFF] Error fetching standings for teamId ${teamId}:`, error)
    }
    return null
  }
}
