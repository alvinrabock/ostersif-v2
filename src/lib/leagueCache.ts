import fs from 'fs/promises'
import path from 'path'
import { fetchPosts } from './frontspace/client'

const CACHE_FILE_PATH = path.join(process.cwd(), 'src/data/league-cache.json')

export interface LeagueCacheData {
  teamId: string
  teamName: string
  lastUpdated: string | null
  leagues: {
    leagueId: string
    leagueName: string
    startDate: string
    endDate: string
    tournamentId: number
    seasonYear: string
    ostersTeamId?: string // League-specific Östers IF team ID
  }[]
}

export interface SeasonGroup {
  seasonYear: string
  tournaments: {
    LeagueName: string
    leagueId: string
    id: string
    tournamentId: number
    kon?: 'herr' | 'dam'
    kalender_url?: string
    visa_i_filter?: boolean
    visningsnamn?: string
    altLeagueIds?: string[] // All alternative IDs (SMC ULID, SvFF competition ID, smc_externalleagueid)
  }[]
}

/**
 * Get topbar configuration based on current season's league
 */
export async function getTopbarConfig(): Promise<{ allsvenskan: number; superettan: number; damallsvenskan: number; elitettan: number }> {
  const cache = await getLeagueCache()

  // Default: no topbars
  const config = {
    allsvenskan: 0,
    superettan: 0,
    damallsvenskan: 0,
    elitettan: 0,
  }

  if (!cache) return config

  // Get current year
  const currentYear = new Date().getFullYear().toString()

  // Find leagues for current season
  const currentSeasonLeagues = cache.leagues.filter(l => l.seasonYear === currentYear)

  // Determine which league(s) to show based on league name
  for (const league of currentSeasonLeagues) {
    const leagueName = league.leagueName.toLowerCase()

    if (leagueName.includes('allsvenskan')) {
      config.allsvenskan = 1
    } else if (leagueName.includes('superettan')) {
      config.superettan = 1
    } else if (leagueName.includes('damallsvenskan')) {
      config.damallsvenskan = 1
    } else if (leagueName.includes('elitettan')) {
      config.elitettan = 1
    }
  }

  return config
}

/**
 * Reads the league cache from disk
 */
export async function getLeagueCache(): Promise<LeagueCacheData | null> {
  try {
    const cacheContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8')
    return JSON.parse(cacheContent)
  } catch (error) {
    console.error('Error reading league cache:', error)
    return null
  }
}

/**
 * Gets all leagues for a specific season
 */
export async function getLeaguesBySeason(seasonYear: string): Promise<LeagueCacheData['leagues']> {
  const cache = await getLeagueCache()
  if (!cache) return []

  return cache.leagues.filter(league => league.seasonYear === seasonYear)
}

/**
 * Gets all unique season years from the cache
 */
export async function getAllSeasons(): Promise<string[]> {
  const cache = await getLeagueCache()
  if (!cache) return []

  const seasons = [...new Set(cache.leagues.map(league => league.seasonYear))]
  return seasons.sort((a, b) => Number(b) - Number(a)) // Newest first
}

/**
 * Gets leagues grouped by season — CMS-first, falls back to file cache
 */
export async function getLeaguesGroupedBySeason(): Promise<SeasonGroup[]> {
  // Try CMS (Turneringar post type) first
  try {
    const { posts } = await fetchPosts<any>('turneringar', { limit: 500 })

    if (posts && posts.length > 0) {
      // Load SMC file cache to cross-reference league IDs by tournamentId
      // This ensures matches synced from SMC (with ULID leagueIds) can be
      // resolved to CMS tournaments that were only synced from SvFF
      const smcCache = await getLeagueCache()
      const smcByTournamentId = new Map<number, string>()
      if (smcCache) {
        for (const league of smcCache.leagues) {
          if (league.tournamentId && league.leagueId) {
            smcByTournamentId.set(league.tournamentId, league.leagueId)
          }
        }
      }

      const seasonMap = new Map<string, SeasonGroup>()

      for (const post of posts) {
        const content = typeof post.content === 'string' ? JSON.parse(post.content) : post.content || {}

        const seasonYear = content.sasong
        const leagueId = content.externalleagueid || content.svff_competition_id
        if (!seasonYear || !leagueId) continue

        // Skip leagues explicitly hidden from filter
        if (content.visa_i_filter === false || content.visa_i_filter === 'false') continue

        // Collect all alternative league IDs (SMC ULID, SvFF competition ID, smc_externalleagueid)
        // so matches from any sync system can be resolved to this tournament
        const altIds = new Set<string>()
        if (content.externalleagueid) altIds.add(String(content.externalleagueid))
        if (content.svff_competition_id) altIds.add(String(content.svff_competition_id))
        if (content.smc_externalleagueid) altIds.add(String(content.smc_externalleagueid))
        // Cross-reference SMC file cache: if this tournament has a tournamentId that
        // matches an SMC league, include the SMC ULID as an alt ID.
        // SMC's tournamentId often equals the SvFF competition ID, so check both.
        const cmsTournamentId = Number(content.tournamentid) || Number(content.smc_tournamentid) || 0
        const svffCompId = Number(content.svff_competition_id) || 0
        for (const tid of [cmsTournamentId, svffCompId]) {
          if (tid && smcByTournamentId.has(tid)) {
            altIds.add(smcByTournamentId.get(tid)!)
          }
        }
        altIds.delete(leagueId) // Don't duplicate the primary ID
        const altLeagueIds = Array.from(altIds)

        const tournamentEntry = {
          LeagueName: content.visningsnamn || post.title,
          leagueId,
          id: leagueId,
          tournamentId: Number(content.tournamentid) || 0,
          kon: (content.gendername || content.kon) as 'herr' | 'dam' | undefined,
          kalender_url: content.kalender_url || undefined,
          visa_i_filter: content.visa_i_filter === true || content.visa_i_filter === 'true' ? true : undefined,
          visningsnamn: content.visningsnamn || undefined,
          altLeagueIds: altLeagueIds.length > 0 ? altLeagueIds : undefined,
        }

        // Detect cross-season tournaments (e.g., "Svenska Cupen 2025/26")
        // Add to both seasons so they appear in both filter dropdowns
        // Uses sasong_till field first (set by sync), falls back to title parsing
        const seasons = [seasonYear]
        if (content.sasong_till && content.sasong_till !== seasonYear) {
          seasons.push(content.sasong_till)
        } else {
          const crossSeasonMatch = post.title?.match(/(\d{4})\/(\d{2,4})/)
          if (crossSeasonMatch) {
            const startYear = crossSeasonMatch[1]
            const endPart = crossSeasonMatch[2]
            const endYear = endPart.length === 2 ? startYear.slice(0, 2) + endPart : endPart
            if (endYear !== seasonYear && !seasons.includes(endYear)) {
              seasons.push(endYear)
            }
            if (startYear !== seasonYear && !seasons.includes(startYear)) {
              seasons.push(startYear)
            }
          }
        }

        for (const sy of seasons) {
          if (!seasonMap.has(sy)) {
            seasonMap.set(sy, { seasonYear: sy, tournaments: [] })
          }
          seasonMap.get(sy)!.tournaments.push(tournamentEntry)
        }
      }

      if (seasonMap.size > 0) {
        return Array.from(seasonMap.values()).sort(
          (a, b) => Number(b.seasonYear) - Number(a.seasonYear)
        )
      }
    }
  } catch (error) {
    console.warn('CMS turneringar fetch failed, falling back to file cache:', error)
  }

  // Fallback: read from league-cache.json
  const cache = await getLeagueCache()
  if (!cache) return []

  const seasonMap = new Map<string, SeasonGroup>()

  cache.leagues.forEach(league => {
    if (!seasonMap.has(league.seasonYear)) {
      seasonMap.set(league.seasonYear, { seasonYear: league.seasonYear, tournaments: [] })
    }
    seasonMap.get(league.seasonYear)?.tournaments.push({
      LeagueName: league.leagueName,
      leagueId: league.leagueId,
      id: league.leagueId,
      tournamentId: league.tournamentId,
    })
  })

  return Array.from(seasonMap.values()).sort(
    (a, b) => Number(b.seasonYear) - Number(a.seasonYear)
  )
}

/**
 * Gets a specific league by ID
 */
export async function getLeagueById(leagueId: string): Promise<LeagueCacheData['leagues'][0] | null> {
  const cache = await getLeagueCache()
  if (!cache) return null

  return cache.leagues.find(league => league.leagueId === leagueId) || null
}

/**
 * Checks if the cache is stale (older than specified days)
 */
export async function isCacheStale(daysThreshold: number = 7): Promise<boolean> {
  const cache = await getLeagueCache()
  if (!cache?.lastUpdated) return true

  const lastUpdated = new Date(cache.lastUpdated)
  const now = new Date()
  const daysDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)

  return daysDiff > daysThreshold
}

/**
 * Triggers a cache refresh via the API route
 */
export async function refreshLeagueCache(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'}/api/discover-leagues`, {
      method: 'POST',
    })

    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('Error refreshing league cache:', error)
    return false
  }
}
