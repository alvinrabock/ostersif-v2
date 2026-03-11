"use server"

const SVFF_BASE_URL = 'https://forening-api.svenskfotboll.se'

export interface SvFFClubTeam {
  teamId: number
  name: string
  gender?: string
  ageCategoryName?: string
  footballTypeName?: string
  teamAssociationId?: number
}

export interface SvFFCompetition {
  competitionId: number
  competitionNumber?: string
  name: string
  seasonId?: number
  categoryId?: number
  categoryName?: string
  ageCategoryName?: string
  footballTypeName?: string
  genderId?: number
  genderName?: string
  statusId?: number
  statusName?: string
  isActive?: boolean
}

export interface SvFFTeamEngagement {
  teamId: number
  teamName?: string
  teamEngagementId?: number
  status?: string
  competition?: SvFFCompetition
  teamAssociationId?: number
  seasonId?: number
  competitionId?: number
  competitionName?: string
  competitionStatus?: string
}

export interface SvFFClubDetailsResponse {
  club: {
    clubId: number
    name: string
  }
  teams: SvFFClubTeam[]
  teamEngagements: SvFFTeamEngagement[]
}

/**
 * Fetch club details from SvFF API
 * Returns all teams and their competition engagements in a single call.
 *
 * @param seasonIds - Optional season IDs to filter by (null = recent + current seasons)
 */
export async function fetchSvFFClubDetails(seasonIds?: number[]): Promise<SvFFClubDetailsResponse | null> {
  const apiKey = process.env.SVFF_API_KEY
  if (!apiKey) {
    console.error('[SvFF] SVFF_API_KEY not configured')
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    let url = `${SVFF_BASE_URL}/club/details`
    if (seasonIds && seasonIds.length > 0) {
      const params = seasonIds.map(id => `seasonIds=${id}`).join('&')
      url += `?${params}`
    }

    console.log(`[SvFF] Fetching club details: ${url}`)

    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'ApiKey': apiKey,
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[SvFF] Club details API error: ${response.status}`)
      return null
    }

    const data: SvFFClubDetailsResponse = await response.json()
    console.log(`[SvFF] Club: ${data.club?.name}, ${data.teams?.length ?? 0} teams, ${data.teamEngagements?.length ?? 0} engagements`)
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[SvFF] Timeout fetching club details')
    } else {
      console.error('[SvFF] Error fetching club details:', error)
    }
    return null
  }
}
