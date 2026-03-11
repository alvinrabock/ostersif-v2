"use server"

const SVFF_BASE_URL = 'https://forening-api.svenskfotboll.se'

export interface SvFFGame {
  gameId: number
  gameNumber?: string
  homeClubId?: number
  awayClubId?: number
  homeTeamId?: number
  awayTeamId?: number
  homeTeamName: string
  awayTeamName: string
  homeTeamImageUrl?: string
  awayTeamImageUrl?: string
  homeTeamImageSmlUrl?: string
  awayTeamImageSmlUrl?: string
  goalsScoredHomeTeam?: number
  goalsScoredAwayTeam?: number
  timeAsDateTime: string
  time?: string
  competitionId?: number
  competitionName: string
  competitionNumber?: string
  competitionRoundNumber?: number
  competitionRoundName?: string
  seasonId?: number
  seasonName?: string
  venueName?: string
  venueId?: number
  venueSurfaceName?: string
  venueMunicipalityName?: string
  isFinished: boolean
  isCanceled: boolean
  isPostponed: boolean
  isAbandoned?: boolean
  gameAttendance?: number
  referees?: {
    name?: string
    place?: string
    assistant1Name?: string
    assistant2Name?: string
  }
  ticketUrl?: string
  tvChannelName?: string
  noteForWeb?: string
  ageCategoryName?: string
  genderName?: string
  footballTypeName?: string
}

export interface SvFFGamesResponse {
  clubId: number
  clubName: string
  numberOfGames: number
  games: SvFFGame[]
}

/**
 * Fetch upcoming/past games from SvFF API
 * Returns all games for the club within the given date range
 *
 * @param from - Start date (YYYY-MM-DD). Defaults to 3 months ago.
 * @param to - End date (YYYY-MM-DD). Defaults to 6 months ahead.
 */
export async function fetchSvFFGames(from?: string, to?: string): Promise<SvFFGamesResponse | null> {
  const apiKey = process.env.SVFF_API_KEY
  if (!apiKey) {
    console.error('[SvFF] SVFF_API_KEY not configured')
    return null
  }

  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setMonth(defaultFrom.getMonth() - 3)
  const defaultTo = new Date(now)
  defaultTo.setMonth(defaultTo.getMonth() + 6)

  const fromDate = from || defaultFrom.toISOString().split('T')[0]
  const toDate = to || defaultTo.toISOString().split('T')[0]

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const url = `${SVFF_BASE_URL}/club/upcoming-games?from=${fromDate}&to=${toDate}&w=3&take=1000`
    console.log(`[SvFF] Fetching games: ${url}`)

    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'ApiKey': apiKey,
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[SvFF] API error: ${response.status}`)
      return null
    }

    const data: SvFFGamesResponse = await response.json()
    console.log(`[SvFF] Fetched ${data.numberOfGames} games (${fromDate} → ${toDate})`)
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[SvFF] Timeout fetching games')
    } else {
      console.error('[SvFF] Error fetching games:', error)
    }
    return null
  }
}
