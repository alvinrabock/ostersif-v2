"use server";

/**
 * CMS-First Match Data Fetcher with SMC API Fallback
 *
 * Strategy:
 * 1. Try to fetch matches from Frontspace CMS first (fast, cached)
 * 2. Server-side filtering using where clause for date/status filters
 * 3. If CMS is empty or errors, fall back to direct SMC API fetch
 * 4. Live matches get real-time data overlaid from SMC API
 */

import { MatchCardData } from "@/types";
import {
  frontspace,
  fetchMatcherCached,
  fetchUpcomingMatchesCached,
  fetchRecentMatchesCached,
  fetchMatchesByDateRangeCached,
  fetchMatchesBySeasonCached,
  type WhereClause,
} from "./frontspace/client";
import { getMatches as fetchMatchesFromSMC } from "./fetchMatches";

// League IDs for Östers IF matches (from existing implementation)
const DEFAULT_LEAGUE_IDS = [
  "100182", // Superettan
  "100185", // Svenska Cupen
  // Add more as needed
];

/**
 * Combine date and time fields into ISO datetime string
 */
function combineDateTime(datum?: string, tid?: string): string {
  if (!datum) return '';
  // datum format: YYYY-MM-DD, tid format: HH:mm or HH:mm:ss
  const timePart = tid || '00:00';
  return `${datum}T${timePart}:00`;
}

/**
 * Check if a link is a ticket link (text contains "biljett")
 */
function isTicketLink(link: { lanktext?: string; url?: string }): boolean {
  return !!(link.lanktext && link.lanktext.toLowerCase().includes('biljett'));
}

/**
 * Link button type for ordered rendering
 */
export type LinkButton = {
  type: 'ticket' | 'custom';
  text: string;
  url: string;
};

/**
 * Extract all links from lankar repeater in CMS order
 * Preserves the order from the CMS for correct button rendering
 * CMS field names: lanktext (text), url
 */
function extractLinksInOrder(lankar?: Array<{ lanktext?: string; url?: string }>): LinkButton[] {
  if (!lankar || lankar.length === 0) return [];

  return lankar
    .filter(l => l.lanktext && l.url)
    .map(l => ({
      type: isTicketLink(l) ? 'ticket' as const : 'custom' as const,
      text: l.lanktext!,
      url: l.url!,
    }));
}

/**
 * Extract ticket link from lankar repeater (for backward compatibility)
 * CMS field names: lanktext (text), url
 * Only returns if link text explicitly contains "biljett" (e.g., "Biljetter")
 */
function extractTicketLink(lankar?: Array<{ lanktext?: string; url?: string }>): { url?: string; text?: string } {
  if (!lankar || lankar.length === 0) return {};
  const ticketLink = lankar.find(l => isTicketLink(l));
  if (ticketLink && ticketLink.url) {
    return { url: ticketLink.url, text: ticketLink.lanktext };
  }
  return {};
}

/**
 * Extract first custom button (for backward compatibility)
 */
function extractCustomButton(lankar?: Array<{ lanktext?: string; url?: string }>): { text?: string; link?: string } {
  if (!lankar || lankar.length === 0) return {};
  const customLink = lankar.find(l => l.lanktext && l.url && !isTicketLink(l));
  if (customLink) {
    return { text: customLink.lanktext, link: customLink.url };
  }
  return {};
}

/**
 * Generate a unique numeric ID from a string (CMS post ID)
 * Uses a simple hash function to create a consistent numeric ID
 */
function generateIdFromString(str: string): number {
  return Math.abs(str.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0));
}

/**
 * Check if a match should be considered "Over" based on kickoff time
 * If kickoff + 3 hours has passed and status isn't already "Over", treat as "Over"
 * This is a safety mechanism if the status isn't updated properly
 */
function shouldBeOver(kickoffDateTime: string, currentStatus: string): boolean {
  if (currentStatus === 'Over' || currentStatus === 'over') {
    return false; // Already over, no need to derive
  }

  if (!kickoffDateTime) {
    return false; // No kickoff time, can't derive
  }

  try {
    const kickoffTime = new Date(kickoffDateTime).getTime();
    const now = Date.now();
    const threeHoursMs = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

    // If kickoff + 3 hours is in the past, match should be over
    return now > kickoffTime + threeHoursMs;
  } catch {
    return false; // Invalid date, can't derive
  }
}

/**
 * Normalize CMS status value to MatchCard expected format
 * CMS stores: scheduled, in-progress, over (lowercase)
 * MatchCard expects: Scheduled, In progress, Over (mixed case)
 *
 * Also applies safety mechanism: if kickoff + 3 hours has passed,
 * treat the match as "Over" even if CMS status hasn't been updated
 */
function normalizeMatchStatus(cmsStatus?: string, kickoffDateTime?: string): string {
  const statusMap: Record<string, string> = {
    'scheduled': 'Scheduled',
    'in-progress': 'In progress',
    'over': 'Over',
    // Also handle if already in correct format
    'Scheduled': 'Scheduled',
    'In progress': 'In progress',
    'Over': 'Over',
  };

  const normalizedStatus = statusMap[cmsStatus || ''] || 'Scheduled';

  // Safety mechanism: derive "Over" if kickoff + 3 hours has passed
  if (kickoffDateTime && shouldBeOver(kickoffDateTime, normalizedStatus)) {
    return 'Over';
  }

  return normalizedStatus;
}

/**
 * Transform CMS MatcherPost to MatchCardData format
 * This ensures compatibility with existing components
 * Uses Swedish field names from CMS
 */
function transformCMSMatchToCardData(cmsMatch: any): MatchCardData {
  // CMS stores content as JSON in the 'content' field
  const content = typeof cmsMatch.content === 'string'
    ? JSON.parse(cmsMatch.content)
    : cmsMatch.content || {};

  // Combine date and time into kickoff datetime
  const kickoff = combineDateTime(content.datum, content.tid_for_avspark);

  // Extract links from lankar repeater - preserving CMS order
  const linkButtons = extractLinksInOrder(content.lankar);
  // Also extract individual links for backward compatibility
  const ticketLink = extractTicketLink(content.lankar);
  const customButton = extractCustomButton(content.lankar);

  // Get matchId - prefer external ID (numeric), fallback to generated ID from CMS post ID
  // Also store raw externalMatchId string for URL construction (supports ULIDs)
  const rawExternalMatchId = content.externalmatchid || '';
  const numericExternalMatchId = parseInt(rawExternalMatchId);
  const matchId = !isNaN(numericExternalMatchId) && numericExternalMatchId > 0
    ? numericExternalMatchId
    : generateIdFromString(cmsMatch.id);

  return {
    matchId,
    kickoff,
    modifiedDate: cmsMatch.updated_at || '',
    status: normalizeMatchStatus(content.match_status, kickoff),
    arenaName: content.arena || '',
    leagueId: content.externalleagueid || '', // Keep as string (supports ULID from SMC API 2.0)
    leagueName: content.leaguename || '',
    season: content.sasong || '',
    homeTeam: content.hemmalag || '',
    awayTeam: content.bortalag || '',
    homeTeamLogo: content.logotyp_hemmalag?.url || undefined,
    awayTeamLogo: content.logotype_bortalag?.url || undefined,
    isCustomGame: content.iscustomgame === 'true' || content.iscustomgame === true,
    cmsSlug: cmsMatch.slug || undefined, // CMS slug for URL routing
    cmsId: cmsMatch.id, // CMS post UUID (always unique)
    externalMatchId: rawExternalMatchId || undefined, // Raw SMC match ID (ULID) for URLs
    goalsHome: content.mal_hemmalag ?? 0,
    goalsAway: content.mal_bortalag ?? 0,
    ticketURL: ticketLink.url,
    ticketText: ticketLink.text,
    soldTickets: content.salda_biljetter,
    maxTickets: content.maxtickets,
    customButtonText: customButton.text,
    customButtonLink: customButton.link,
    linkButtons: linkButtons.length > 0 ? linkButtons : undefined,
  };
}

/**
 * Build a where clause for server-side filtering
 * Uses Frontspace PostWhere format: { content: { field: { operator: value } } }
 */
function buildWhereClause(options: {
  status?: 'Scheduled' | 'In progress' | 'Over';
  dateFrom?: string;
  dateTo?: string;
  season?: string;
}): WhereClause | undefined {
  const { status, dateFrom, dateTo, season } = options;

  // Build content filters object
  const contentFilters: Record<string, any> = {};

  // Status filter - CMS stores lowercase: 'scheduled', 'in-progress', 'over'
  if (status) {
    const statusMap: Record<string, string> = {
      'Scheduled': 'scheduled',
      'In progress': 'in-progress',
      'Over': 'over',
    };
    contentFilters.match_status = { equals: statusMap[status] || status.toLowerCase() };
  }

  // Date range filter
  if (dateFrom) {
    contentFilters.datum = { ...contentFilters.datum, greater_than_equal: dateFrom };
  }
  if (dateTo) {
    contentFilters.datum = { ...contentFilters.datum, less_than_equal: dateTo };
  }

  // Season filter
  if (season) {
    contentFilters.sasong = { equals: season };
  }

  // If no filters, return undefined
  if (Object.keys(contentFilters).length === 0) {
    return undefined;
  }

  // Return in Frontspace format: { content: { ... } }
  return { content: contentFilters };
}

/**
 * Get matches - CMS first with SMC fallback
 * Uses server-side filtering with where clause for efficient queries
 *
 * @param options.leagueIds - League IDs to filter by (only used for SMC fallback)
 * @param options.teamId - Team ID to filter by (only used for SMC fallback)
 * @param options.limit - Max number of matches to return
 * @param options.status - Filter by match status (server-side)
 * @param options.dateFrom - Filter matches from this date (server-side, YYYY-MM-DD)
 * @param options.dateTo - Filter matches up to this date (server-side, YYYY-MM-DD)
 * @param options.season - Filter by season year (server-side, e.g., "2025")
 */
export async function getMatchesWithFallback(options?: {
  leagueIds?: string[];
  teamId?: string;
  limit?: number;
  status?: 'Scheduled' | 'In progress' | 'Over';
  dateFrom?: string;
  dateTo?: string;
  season?: string;
}): Promise<MatchCardData[]> {
  const { leagueIds = DEFAULT_LEAGUE_IDS, teamId, limit = 100, status, dateFrom, dateTo, season } = options || {};

  try {
    // Try CMS first with server-side filtering
    const where = buildWhereClause({ status, dateFrom, dateTo, season });

    const { posts: cmsMatches } = await fetchMatcherCached({
      limit,
      where,
    });

    if (cmsMatches && cmsMatches.length > 0) {
      // Transform CMS data to MatchCardData format
      const matches = cmsMatches.map(transformCMSMatchToCardData);

      // Sort by status priority and kickoff date
      return sortMatches(matches);
    }
  } catch (error) {
    console.error('❌ CMS fetch failed, falling back to SMC API:', error);
  }

  // Fallback: fetch directly from SMC API
  try {
    const smcMatches = await fetchMatchesFromSMC(leagueIds, teamId);

    // Filter by status if specified (client-side for SMC fallback)
    let filteredMatches = smcMatches;
    if (status) {
      filteredMatches = filteredMatches.filter(m => m.status === status);
    }
    if (dateFrom) {
      filteredMatches = filteredMatches.filter(m => m.kickoff >= dateFrom);
    }
    if (dateTo) {
      filteredMatches = filteredMatches.filter(m => m.kickoff.split('T')[0] <= dateTo);
    }

    return filteredMatches;
  } catch (error) {
    console.error('❌ SMC API fallback also failed:', error);
    return [];
  }
}

/**
 * Get upcoming matches using server-side date filtering and sorting
 * Filters: datum >= today, match_status != 'over'
 * Sorted by datum ascending (soonest first)
 */
export async function getUpcomingMatches(limit = 10): Promise<MatchCardData[]> {
  try {
    // Use server-side filtering and sorting via cached function
    const { posts: cmsMatches } = await fetchUpcomingMatchesCached(limit);

    // Server log to debug API sorting
    console.log('[getUpcomingMatches] Raw API order:', cmsMatches?.slice(0, 5).map(m => {
      const raw = m as any;
      const content = typeof raw.content === 'string' ? JSON.parse(raw.content) : raw.content;
      return { title: m.title, datum: content?.datum };
    }));

    if (cmsMatches && cmsMatches.length > 0) {
      // Transform CMS data to MatchCardData format
      const matches = cmsMatches.map(transformCMSMatchToCardData);

      // Sort by kickoff date ascending (soonest first)
      // Client-side sorting as safeguard in case API sorting isn't available
      const sorted = matches.sort((a, b) =>
        new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      );

      console.log('[getUpcomingMatches] After client sort:', sorted.slice(0, 5).map(m => ({
        homeTeam: m.homeTeam,
        kickoff: m.kickoff,
      })));

      return sorted;
    }
  } catch (error) {
    console.error('CMS upcoming matches fetch failed:', error);
  }

  // Fallback to SMC API
  const today = new Date().toISOString().split('T')[0];
  return getMatchesWithFallback({ limit, dateFrom: today });
}

/**
 * Get recent/past matches using server-side filtering
 * Filters: status = 'Over', sorted by date descending (most recent first)
 */
export async function getRecentMatches(limit = 10): Promise<MatchCardData[]> {
  try {
    // Use server-side filtering via cached function
    const { posts: cmsMatches } = await fetchRecentMatchesCached(limit);

    if (cmsMatches && cmsMatches.length > 0) {
      const matches = cmsMatches.map(transformCMSMatchToCardData);
      // Explicitly sort by kickoff date descending (most recent first)
      // This ensures correct order even if CMS API sorting isn't working
      return matches.sort((a, b) =>
        new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()
      );
    }
  } catch (error) {
    console.error('CMS recent matches fetch failed:', error);
  }

  // Fallback with client-side sorting
  const matches = await getMatchesWithFallback({ limit, status: 'Over' });
  return matches.sort((a, b) =>
    new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()
  );
}

/**
 * Get matches by date range using server-side filtering
 * Sorted by kickoff date ascending
 */
export async function getMatchesByDateRange(
  startDate: string,
  endDate: string,
  limit = 100
): Promise<MatchCardData[]> {
  try {
    // Use server-side filtering via cached function
    const { posts: cmsMatches } = await fetchMatchesByDateRangeCached(startDate, endDate, limit);

    if (cmsMatches && cmsMatches.length > 0) {
      const matches = cmsMatches.map(transformCMSMatchToCardData);
      // Explicitly sort by kickoff date ascending
      return matches.sort((a, b) =>
        new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      );
    }
  } catch (error) {
    console.error('CMS date range matches fetch failed:', error);
  }

  // Fallback
  const matches = await getMatchesWithFallback({ limit, dateFrom: startDate, dateTo: endDate });
  return matches.sort((a, b) =>
    new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
  );
}

/**
 * Get matches by season using server-side filtering
 * Sorted by kickoff date ascending
 */
export async function getMatchesBySeason(
  season: string,
  limit = 100
): Promise<MatchCardData[]> {
  try {
    // Use server-side filtering via cached function
    const { posts: cmsMatches } = await fetchMatchesBySeasonCached(season, limit);

    if (cmsMatches && cmsMatches.length > 0) {
      const matches = cmsMatches.map(transformCMSMatchToCardData);
      // Explicitly sort by kickoff date ascending
      return matches.sort((a, b) =>
        new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      );
    }
  } catch (error) {
    console.error('CMS season matches fetch failed:', error);
  }

  // Fallback
  return getMatchesWithFallback({ limit, season });
}

/**
 * Server action for fetching matches with filters
 * Can be called from client components
 * Uses CMS server-side filtering for optimal performance
 */
export async function getFilteredMatches(options: {
  status?: 'Scheduled' | 'In progress' | 'Over' | 'upcoming' | 'played';
  dateFrom?: string;
  dateTo?: string;
  season?: string;
  location?: 'home' | 'away';
  leagueId?: string;
  limit?: number;
}): Promise<MatchCardData[]> {
  const { status, dateFrom, dateTo, season, location, leagueId, limit = 200 } = options;

  // Build content filters in Frontspace format: { content: { field: { operator: value } } }
  const contentFilters: Record<string, any> = {};

  // Status filter - convert 'upcoming' and 'played' to actual statuses
  // Note: CMS stores lowercase status: 'scheduled', 'in-progress', 'over'
  if (status === 'Over' || status === 'played') {
    contentFilters.match_status = { equals: 'over' };
  } else if (status === 'In progress') {
    contentFilters.match_status = { equals: 'in-progress' };
  } else if (status === 'Scheduled') {
    contentFilters.match_status = { equals: 'scheduled' };
  }
  // Note: For 'upcoming', we'll filter client-side since OR inside content is complex

  // Date range filter
  if (dateFrom) {
    contentFilters.datum = { ...contentFilters.datum, greater_than_equal: dateFrom };
  }
  if (dateTo) {
    contentFilters.datum = { ...contentFilters.datum, less_than_equal: dateTo };
  }

  // Season filter
  if (season) {
    contentFilters.sasong = { equals: season };
  }

  // League filter
  if (leagueId) {
    contentFilters.externalleagueid = { equals: leagueId };
  }

  // Build final where clause
  let where: WhereClause | undefined;
  if (Object.keys(contentFilters).length === 0) {
    where = undefined;
  } else {
    where = { content: contentFilters };
  }

  // Determine sort direction based on status
  const isPlayedFilter = status === 'Over' || status === 'played';

  try {
    // Fetch from CMS with caching
    const { posts: cmsMatches } = await fetchMatcherCached({
      limit,
      where,
    });

    if (cmsMatches && cmsMatches.length > 0) {
      // Transform CMS data to MatchCardData format
      let matches = cmsMatches.map(transformCMSMatchToCardData);

      // Apply location filter (home/away) - this needs client-side filtering
      // because it depends on team name matching which CMS doesn't know about
      if (location) {
        const OSTERS_IF_NAMES = ['Östers IF', 'Öster', 'Östers', 'osters if', 'osters'];
        matches = matches.filter(match => {
          const isHome = OSTERS_IF_NAMES.some(name =>
            match.homeTeam.toLowerCase().includes(name.toLowerCase())
          );
          return location === 'home' ? isHome : !isHome;
        });
      }

      // Sort by kickoff date
      if (isPlayedFilter) {
        // Past matches: newest first
        matches.sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());
      } else {
        // Default view: Live first, Scheduled second, Over (played) last
        matches.sort((a, b) => {
          // Status priority: In progress (0) > Scheduled (1) > Over (2)
          const statusPriority: Record<string, number> = {
            'In progress': 0,
            'Scheduled': 1,
            'Over': 2,
          };
          const aPriority = statusPriority[a.status] ?? 1;
          const bPriority = statusPriority[b.status] ?? 1;

          if (aPriority !== bPriority) return aPriority - bPriority;

          // Within same status, sort by date
          // Upcoming/live: soonest first (ascending)
          // Played: most recent first (descending)
          if (a.status === 'Over') {
            return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
          }
          return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
        });
      }

      return matches;
    }

    console.warn('⚠️ CMS returned no matches');
    return [];
  } catch (error) {
    console.error('❌ CMS fetch failed:', error);
    return [];
  }
}

/**
 * Get a single match by external match ID (from SMC) or CMS slug
 * This is used for the single match page /matcher/[leagueID]/[id]
 */
export async function getMatchById(matchId: string, leagueId?: string): Promise<MatchCardData | null> {
  try {
    // Try CMS first - search by externalmatchid
    const { posts: cmsMatches } = await fetchMatcherCached({
      limit: 1,
      where: {
        content: {
          externalmatchid: { equals: matchId },
        },
      },
    });

    if (cmsMatches && cmsMatches.length > 0) {
      return transformCMSMatchToCardData(cmsMatches[0]);
    }

    // Try by CMS post ID (UUID/ULID) - for matches linked via cmsId in URL
    try {
      const matchById = await frontspace.matcher.getById(matchId);
      if (matchById) {
        return transformCMSMatchToCardData(matchById);
      }
    } catch {
      // ID lookup failed, continue
    }

    // Try by slug as fallback (for custom matches)
    try {
      const matchBySlug = await frontspace.matcher.getBySlug(matchId);
      if (matchBySlug) {
        return transformCMSMatchToCardData(matchBySlug);
      }
    } catch {
      // Slug lookup failed, continue to SMC fallback
    }
  } catch (error) {
    console.error('CMS match fetch failed:', error);
  }

  // Fallback: fetch from SMC API
  try {
    const leagueIds = leagueId ? [leagueId] : DEFAULT_LEAGUE_IDS;
    const allMatches = await fetchMatchesFromSMC(leagueIds);
    const match = allMatches.find(m => m.matchId.toString() === matchId);

    if (match) {
      return match;
    }

    return null;
  } catch (error) {
    console.error('SMC fallback also failed:', error);
    return null;
  }
}

/**
 * Sort matches by status priority and kickoff date
 * Order: Live first, Scheduled second, Played (Over) last
 * Within status: Upcoming/Live by soonest first, Played by most recent first
 */
function sortMatches(matches: MatchCardData[]): MatchCardData[] {
  return matches.sort((a, b) => {
    // Status priority: In progress > Scheduled > Over
    const statusPriority: Record<string, number> = {
      'In progress': 0,
      'Scheduled': 1,
      'Over': 2,
    };

    const statusDiff = (statusPriority[a.status] ?? 1) - (statusPriority[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;

    // Within same status, sort by date
    // Played matches: most recent first (descending)
    if (a.status === 'Over') {
      return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
    }
    // Upcoming/Live: soonest first (ascending)
    return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
  });
}
