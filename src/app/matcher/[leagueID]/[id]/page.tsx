// app/matcher/[leagueID]/[id]/page.tsx
import { getMatchById } from "@/lib/getMatchesWithFallback";
import {
    getSingleMatch,
    getFinishedMatchCached,
    getUpcomingMatchCached,
    getMatchStatusCategory
} from "@/lib/matchCache";
import { fetchtLineupData } from "@/lib/Superadmin/fetchLineup";
import type { Metadata } from 'next';
import MatchClient from "./MatchClient";
import { cache } from 'react';
import { MatchLineup, Match } from '@/types';

// Use dynamic rendering to support tiered caching
// Finished matches: cached forever | Upcoming: 5 min cache | Live: always fresh
export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ leagueID: string; id: string }>;
};

// Cache the initial fetch within a single request
const getCachedMatch = cache(getSingleMatch);
const getCachedCMSMatch = cache(getMatchById);

// Get match with SMC-first for full data, CMS as fallback for custom matches
async function getMatchWithCache(leagueId: string, matchId: string): Promise<Match | null> {
    // Try SMC API first for full Match data (includes lineup, team IDs, etc.)
    const match = await getCachedMatch(leagueId, matchId);

    if (match) {
        const category = getMatchStatusCategory(match);

        // For finished matches, use forever-cached version
        if (category === 'finished') {
            return getFinishedMatchCached(leagueId, matchId);
        }
        // For upcoming, use 5 min cache
        if (category === 'upcoming') {
            return getUpcomingMatchCached(leagueId, matchId);
        }
        // Live matches - return fresh data
        return match;
    }

    // Fallback: Check CMS for custom matches not in SMC
    console.log('⚠️ SMC miss, checking CMS for custom match...');
    const cmsMatch = await getCachedCMSMatch(matchId, leagueId);

    if (cmsMatch) {
        console.log('✅ Found custom match in CMS');
        // Convert CMS MatchCardData to Match type with minimal fields
        return {
            matchId: cmsMatch.matchId,
            extMatchId: String(cmsMatch.matchId),
            kickoff: cmsMatch.kickoff,
            modifiedDate: cmsMatch.modifiedDate || '',
            matchTotalTime: 0,
            statusId: 0,
            status: cmsMatch.status,
            seasonId: 0,
            season: cmsMatch.season || '',
            arenaId: 0,
            arenaName: cmsMatch.arenaName,
            leagueId: cmsMatch.leagueId,
            leagueName: cmsMatch.leagueName || '',
            homeTeam: cmsMatch.homeTeam,
            homeTeamId: '',
            extHomeTeamId: '',
            awayTeam: cmsMatch.awayTeam,
            awayTeamId: '',
            extAwayTeamId: '',
            roundNumber: 0,
            homeEngagingTeam: '',
            awayEngagingTeam: '',
            attendees: null,
            goalsHome: cmsMatch.goalsHome,
            goalsAway: cmsMatch.goalsAway,
            homeLineup: { formation: '', players: [] },
            awayLineup: { formation: '', players: [] },
            referees: [],
            ticketURL: cmsMatch.ticketURL,
            soldTickets: cmsMatch.soldTickets,
            customButtonText: cmsMatch.customButtonText,
            customButtonLink: cmsMatch.customButtonLink,
        } as Match;
    }

    return null;
}

// Generate dynamic metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const { leagueID, id } = resolvedParams;

    // Support both string IDs (SMC API 2.0 ULIDs) and numeric IDs (Fogis)
    if (!leagueID || !id) {
        return {
            title: 'Match inte hittad - Östers IF',
            description: 'Den begärda matchen kunde inte hittas.',
        };
    }

    try {
        // Use tiered caching: finished (forever), upcoming (5 min), live (fresh)
        const matchDetails = await getMatchWithCache(leagueID, id);

        if (!matchDetails) {
            return {
                title: 'Match inte hittad - Östers IF',
                description: 'Den begärda matchen kunde inte hittas.',
            };
        }

        const { homeTeam, awayTeam, kickoff, status, leagueName } = matchDetails;
        
        // Format match date
        const formatMatchDate = (dateString: string) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('sv-SE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Stockholm',
            }).format(date);
        };

        const formattedDate = formatMatchDate(kickoff);
        
        // Extract year from kickoff date
        const getYearFromDate = (dateString: string) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.getFullYear().toString();
        };

        const matchYear = getYearFromDate(kickoff);
        
        // Create match title with league name and year
        const baseMatchTitle = `${homeTeam} - ${awayTeam}`;
        const leagueAndYear = [leagueName, matchYear].filter(Boolean).join(' ');
        const matchTitle = leagueAndYear ? `${baseMatchTitle} - ${leagueAndYear}` : baseMatchTitle;
        
        // Determine match status for description
        const getMatchStatusText = (status: string) => {
            switch (status?.toLowerCase()) {
                case 'finished':
                case 'slutspelad':
                    return 'Slutspelad match';
                case 'live':
                case 'in progress':
                case 'pågår':
                    return 'Live match';
                case 'upcoming':
                case 'kommande':
                    return 'Kommande match';
                default:
                    return 'Match';
            }
        };

        const statusText = getMatchStatusText(status);
        const description = `${statusText} mellan ${homeTeam} och ${awayTeam}${leagueName ? ` i ${leagueName}` : ''}${formattedDate ? ` - ${formattedDate}` : ''}. Se laguppställning, liverapportering, statistik och tabellställning.`;

        // Determine if this is an Östers IF match
        const isOstersMatch = homeTeam?.toLowerCase().includes('öster') || awayTeam?.toLowerCase().includes('öster');
        const titleSuffix = isOstersMatch ? ' - Östers IF' : ' - Fotbollsmatch';

        return {
            title: `${matchTitle}${titleSuffix}`,
            description,
            keywords: `${homeTeam}, ${awayTeam}, fotboll, match, ${leagueName || ''}, ${isOstersMatch ? 'Östers IF, Växjö, Superettan,' : ''} laguppställning, liverapportering, statistik`,
            openGraph: {
                title: `${matchTitle}${titleSuffix}`,
                description,
                type: 'website',
                locale: 'sv_SE',
                siteName: isOstersMatch ? 'Östers IF' : 'Fotboll',
                ...(formattedDate && { 
                    article: {
                        publishedTime: kickoff,
                        section: 'Sport',
                        tags: [homeTeam, awayTeam, leagueName || 'Fotboll'].filter(Boolean),
                    }
                }),
            },
            alternates: {
                canonical: `/matcher/${leagueID}/${id}`,
                languages: {
                    'sv-SE': `/matcher/${leagueID}/${id}`,
                },
            },
            other: {
                'match:home_team': homeTeam,
                'match:away_team': awayTeam,
                'match:league': leagueName || '',
                'match:date': kickoff,
                'match:status': status,
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Match - Östers IF',
            description: 'Matchinformation från Östers IF',
        };
    }
}

// Server component wrapper - fetch data and pass to client
export default async function Page({ params }: PageProps) {
    const resolvedParams = await params;
    const { leagueID, id } = resolvedParams;

    // Pre-fetch match data server-side to avoid client waterfall
    let initialMatchDetails = null;
    let initialLineupData: MatchLineup | null = null;

    try {
        if (leagueID && id) {
            initialMatchDetails = await getMatchWithCache(leagueID, id);

            // Pre-fetch lineup data if we have the required fields
            if (initialMatchDetails?.leagueName && initialMatchDetails?.season && initialMatchDetails?.extMatchId) {
                try {
                    initialLineupData = await fetchtLineupData({
                        league: initialMatchDetails.leagueName,
                        season: initialMatchDetails.season,
                        extMatchId: initialMatchDetails.extMatchId,
                    });
                } catch (lineupError) {
                    // Lineup fetch can fail silently - it's not critical
                    console.warn('Error pre-fetching lineup:', lineupError);
                }
            }
        }
    } catch (error) {
        console.error('Error pre-fetching match:', error);
    }

    return <MatchClient initialMatchDetails={initialMatchDetails} initialLineupData={initialLineupData} />;
}