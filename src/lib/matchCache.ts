import { unstable_cache } from 'next/cache'
import { MatchCardData, Match } from '@/types'
import { fetchMatchDataBulk } from './fetchMatchDataBulk'
import { fetchtLineupData } from './Superadmin/fetchLineup'

// Re-export the original functions for direct access when needed
export { getMatches } from './fetchMatches'
export { getSingleMatch } from './fetchSingleMatch'

// Import the original functions
import { getMatches as getMatchesOriginal } from './fetchMatches'
import { getSingleMatch as getSingleMatchOriginal } from './fetchSingleMatch'

/**
 * Tiered Caching Strategy:
 *
 * 1. Finished matches - cached indefinitely (until Service Bus invalidates)
 * 2. Upcoming matches - cached for 5 minutes
 * 3. Live matches - always fresh (no cache)
 *
 * Service Bus can invalidate any of these via revalidateTag()
 */

// Helper to determine match status category
export function getMatchStatusCategory(match: { status: string; kickoff?: string }): 'live' | 'finished' | 'upcoming' {
  if (match.status === 'In progress') {
    return 'live'
  }
  if (match.status === 'Over') {
    return 'finished'
  }
  return 'upcoming'
}

// ============================================
// SINGLE MATCH CACHING
// ============================================

/**
 * Get a finished match - cached indefinitely
 * Only invalidated by Service Bus when match data changes
 */
export const getFinishedMatchCached = unstable_cache(
  async (leagueId: string, matchId: string): Promise<Match> => {
    console.log(`[Cache] Fetching finished match ${matchId} from API`)
    return getSingleMatchOriginal(leagueId, matchId)
  },
  ['finished-match'],
  {
    tags: ['finished-matches'],
    // No revalidate = cached until explicitly invalidated
  }
)

/**
 * Get an upcoming match - cached for 5 minutes
 * Shorter cache since match details may change (time, venue, etc.)
 */
export const getUpcomingMatchCached = unstable_cache(
  async (leagueId: string, matchId: string): Promise<Match> => {
    console.log(`[Cache] Fetching upcoming match ${matchId} from API`)
    return getSingleMatchOriginal(leagueId, matchId)
  },
  ['upcoming-match'],
  {
    revalidate: 300, // 5 minutes
    tags: ['upcoming-matches']
  }
)

/**
 * Get a live match - always fresh, no caching
 */
export async function getLiveMatch(leagueId: string, matchId: string): Promise<Match> {
  console.log(`[Cache] Fetching LIVE match ${matchId} - no cache`)
  return getSingleMatchOriginal(leagueId, matchId)
}

/**
 * Smart single match fetcher - automatically picks the right cache strategy
 * based on match status
 */
export async function getMatchWithTieredCache(leagueId: string, matchId: string): Promise<Match> {
  // First, do a quick fetch to check status
  // This is necessary because we need to know the status before choosing cache strategy
  const match = await getSingleMatchOriginal(leagueId, matchId)
  const category = getMatchStatusCategory(match)

  // For finished matches, use the cached version (the initial fetch populated the server cache)
  // For live matches, we already have fresh data
  // For upcoming, the initial fetch is recent enough

  // The benefit comes on subsequent requests:
  if (category === 'finished') {
    // Return cached version for future requests
    return getFinishedMatchCached(leagueId, matchId)
  } else if (category === 'live') {
    // Always return fresh data
    return match
  } else {
    // Upcoming - use 5 min cache
    return getUpcomingMatchCached(leagueId, matchId)
  }
}

// ============================================
// MATCH LIST CACHING
// ============================================

/**
 * Get all matches with smart caching
 * Fetches once, caches the full result, then splits by status
 *
 * Cache strategy:
 * - Full list cached for 60 seconds (background revalidation)
 * - Service Bus can invalidate via revalidateTag('matches-list')
 */
export const getAllMatchesCached = unstable_cache(
  async (leagueIds: string[], teamId: string): Promise<MatchCardData[]> => {
    console.log(`[Cache] Fetching all matches for ${leagueIds.length} leagues`)
    return getMatchesOriginal(leagueIds, teamId)
  },
  ['all-matches-list'],
  {
    revalidate: 60, // 60 seconds - balance between freshness and performance
    tags: ['matches-list', 'finished-matches', 'upcoming-matches']
  }
)

/**
 * Get all matches with tiered caching
 * Fetches ONCE and splits by status - much more efficient!
 */
export async function getAllMatchesWithTieredCache(
  leagueIds: string[],
  teamId: string
): Promise<{
  finished: MatchCardData[]
  upcoming: MatchCardData[]
  live: MatchCardData[]
  all: MatchCardData[]
}> {
  // Single fetch with caching
  const allMatches = await getAllMatchesCached(leagueIds, teamId)

  // Split by status (no additional API calls!)
  const finished = allMatches.filter(m => m.status === 'Over')
  const upcoming = allMatches.filter(m => m.status !== 'Over' && m.status !== 'In progress')
  const live = allMatches.filter(m => m.status === 'In progress')

  // Combine and sort: live first, then upcoming (soonest first), then finished (most recent first)
  const all = [
    ...live,
    ...upcoming.sort((a, b) => new Date(a.kickoff ?? '').getTime() - new Date(b.kickoff ?? '').getTime()),
    ...finished.sort((a, b) => new Date(b.kickoff ?? '').getTime() - new Date(a.kickoff ?? '').getTime()),
  ]

  return { finished, upcoming, live, all }
}

// Legacy functions for backwards compatibility
export const getFinishedMatchesCached = async (leagueIds: string[], teamId: string) => {
  const { finished } = await getAllMatchesWithTieredCache(leagueIds, teamId)
  return finished
}

export const getUpcomingMatchesCached = async (leagueIds: string[], teamId: string) => {
  const { upcoming } = await getAllMatchesWithTieredCache(leagueIds, teamId)
  return upcoming
}

export async function getLiveMatches(leagueIds: string[], teamId: string) {
  const { live } = await getAllMatchesWithTieredCache(leagueIds, teamId)
  return live
}

// ============================================
// LIVE DATA CACHING (for Service Bus integration)
// ============================================

/**
 * Get live match data with per-match caching
 * Invalidated by Service Bus on GOAL, CARD, SUBSTITUTION events
 */
export function getLiveDataCached(matchId: string) {
  return unstable_cache(
    async (leagueId: string) => {
      console.log(`[Cache] Fetching live data for match ${matchId} from API`)
      return fetchMatchDataBulk(leagueId, matchId, {
        includeLiveStats: true,
        includeGoals: true,
        includeMatchPhase: true,
        includeEvents: true,
      })
    },
    [`match-live-${matchId}`],
    {
      tags: [`match-live-${matchId}`, `match-${matchId}`],
      // No revalidate = cached until Service Bus invalidates
    }
  )
}

/**
 * Get lineup data with per-match caching
 * Invalidated by Service Bus on LINEUP_PUBLISHED events
 */
export function getLineupCached(matchId: string) {
  return unstable_cache(
    async (league: string, season: string, extMatchId: string) => {
      console.log(`[Cache] Fetching lineup for match ${matchId} from API`)
      return fetchtLineupData({ league, season, extMatchId })
    },
    [`match-lineup-${matchId}`],
    {
      tags: [`match-lineup-${matchId}`, `match-${matchId}`],
      // No revalidate = cached until Service Bus invalidates
    }
  )
}

/**
 * Get match events with per-match caching
 * Invalidated by Service Bus on any match event
 */
export function getEventsCached(matchId: string) {
  return unstable_cache(
    async (leagueId: string) => {
      console.log(`[Cache] Fetching events for match ${matchId} from API`)
      return fetchMatchDataBulk(leagueId, matchId, {
        includeLiveStats: false,
        includeGoals: false,
        includeMatchPhase: false,
        includeEvents: true,
      })
    },
    [`match-events-${matchId}`],
    {
      tags: [`match-events-${matchId}`, `match-${matchId}`],
      // No revalidate = cached until Service Bus invalidates
    }
  )
}
