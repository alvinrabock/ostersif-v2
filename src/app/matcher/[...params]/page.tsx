// app/matcher/[...params]/page.tsx
// Unified route handler for both:
// - /matcher/[cmsId] (single param - CMS lookup)
// - /matcher/[leagueID]/[matchID] (two params - SMC lookup with CMS fallback)

import { getMatchById } from "@/lib/getMatchesWithFallback";
import {
    getSingleMatch,
    getFinishedMatchCached,
    getUpcomingMatchCached,
    getMatchStatusCategory
} from "@/lib/matchCache";
import { fetchtLineupData } from "@/lib/Superadmin/fetchLineup";
import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import MatchClient from "./MatchClient";
import { cache } from 'react';
import { MatchLineup, Match, MatchCardData } from '@/types';

// Use dynamic rendering for real-time match data
export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ params: string[] }>;
};

// Cache fetches within a single request
const getCachedMatch = cache(getSingleMatch);
const getCachedCMSMatch = cache(getMatchById);

/**
 * Convert CMS MatchCardData to Match type
 */
function cmsToMatch(cmsMatch: MatchCardData): Match {
    return {
        matchId: cmsMatch.matchId,
        extMatchId: cmsMatch.externalMatchId || String(cmsMatch.matchId),
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

/**
 * CMS-first data fetching strategy
 * 1. Always try CMS first
 * 2. If found and is custom game → use CMS data only
 * 3. If found and NOT custom → enhance with SMC data (lineup, live stats)
 * 4. If not found in CMS → try SMC directly
 */
async function getMatchData(params: string[]): Promise<{
    matchDetails: Match | null;
    lineupData: MatchLineup | null;
    isCustomGame: boolean;
    leagueId: string;
    matchId: string;
}> {
    const isSingleParam = params.length === 1;
    const cmsId = isSingleParam ? params[0] : null;
    const leagueId = isSingleParam ? '' : params[0];
    const matchId = isSingleParam ? params[0] : params[1];

    let matchDetails: Match | null = null;
    let lineupData: MatchLineup | null = null;
    let isCustomGame = false;

    // Step 1: Try CMS first (always)
    console.log('📦 Fetching from CMS first...');
    const cmsMatch = await getCachedCMSMatch(cmsId || matchId);

    if (cmsMatch) {
        console.log('✅ Found match in CMS');
        isCustomGame = cmsMatch.isCustomGame || false;

        // Convert CMS data to Match type
        matchDetails = cmsToMatch(cmsMatch);

        // Use leagueId from CMS if we only had cmsId
        const resolvedLeagueId = String(leagueId || cmsMatch.leagueId || '');
        const resolvedMatchId = String(cmsMatch.externalMatchId || matchId);

        // Step 2: If NOT custom game, enhance with SMC data
        if (!isCustomGame && resolvedLeagueId && resolvedMatchId) {
            console.log('🔄 Not a custom game, fetching SMC data...');

            try {
                const smcMatch = await getCachedMatch(resolvedLeagueId, resolvedMatchId);

                if (smcMatch) {
                    console.log('✅ Enhanced with SMC data');
                    const category = getMatchStatusCategory(smcMatch);

                    // Use cached version based on match status
                    if (category === 'finished') {
                        matchDetails = await getFinishedMatchCached(resolvedLeagueId, resolvedMatchId);
                    } else if (category === 'upcoming') {
                        matchDetails = await getUpcomingMatchCached(resolvedLeagueId, resolvedMatchId);
                    } else {
                        matchDetails = smcMatch;
                    }

                    // Preserve CMS-specific fields (ticket URL, custom buttons, etc.)
                    if (matchDetails && cmsMatch) {
                        matchDetails.ticketURL = cmsMatch.ticketURL || matchDetails.ticketURL;
                        matchDetails.soldTickets = cmsMatch.soldTickets || matchDetails.soldTickets;
                        matchDetails.customButtonText = cmsMatch.customButtonText || matchDetails.customButtonText;
                        matchDetails.customButtonLink = cmsMatch.customButtonLink || matchDetails.customButtonLink;
                    }

                    // Fetch lineup data from SMC
                    if (matchDetails?.leagueName && matchDetails?.season && matchDetails?.extMatchId) {
                        try {
                            lineupData = await fetchtLineupData({
                                league: matchDetails.leagueName,
                                season: matchDetails.season,
                                extMatchId: matchDetails.extMatchId,
                            });
                        } catch (lineupError) {
                            console.warn('⚠️ Lineup fetch failed:', lineupError);
                        }
                    }
                }
            } catch (smcError) {
                console.warn('⚠️ SMC fetch failed, using CMS data only:', smcError);
            }
        }

        return {
            matchDetails,
            lineupData,
            isCustomGame,
            leagueId: String(cmsMatch.leagueId || leagueId),
            matchId: String(cmsMatch.externalMatchId || matchId),
        };
    }

    // Step 3: Fallback to SMC directly (no CMS data found)
    if (!isSingleParam && leagueId && matchId) {
        console.log('⚠️ CMS miss, trying SMC directly...');

        try {
            const smcMatch = await getCachedMatch(leagueId, matchId);

            if (smcMatch) {
                const category = getMatchStatusCategory(smcMatch);

                if (category === 'finished') {
                    matchDetails = await getFinishedMatchCached(leagueId, matchId);
                } else if (category === 'upcoming') {
                    matchDetails = await getUpcomingMatchCached(leagueId, matchId);
                } else {
                    matchDetails = smcMatch;
                }

                // Fetch lineup
                if (matchDetails?.leagueName && matchDetails?.season && matchDetails?.extMatchId) {
                    try {
                        lineupData = await fetchtLineupData({
                            league: matchDetails.leagueName,
                            season: matchDetails.season,
                            extMatchId: matchDetails.extMatchId,
                        });
                    } catch (lineupError) {
                        console.warn('⚠️ Lineup fetch failed:', lineupError);
                    }
                }
            }
        } catch (smcError) {
            console.error('❌ SMC fetch failed:', smcError);
        }
    }

    return {
        matchDetails,
        lineupData,
        isCustomGame,
        leagueId,
        matchId,
    };
}

// Generate dynamic metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const urlParams = resolvedParams.params;

    if (!urlParams || urlParams.length === 0 || urlParams.length > 2) {
        return {
            title: 'Match inte hittad - Östers IF',
            description: 'Den begärda matchen kunde inte hittas.',
        };
    }

    try {
        const { matchDetails, leagueId, matchId } = await getMatchData(urlParams);

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
                case 'over':
                    return 'Slutspelad match';
                case 'live':
                case 'in progress':
                case 'pågår':
                    return 'Live match';
                case 'upcoming':
                case 'kommande':
                case 'scheduled':
                    return 'Kommande match';
                default:
                    return 'Match';
            }
        };

        const statusText = getMatchStatusText(status);
        const description = `${statusText} mellan ${homeTeam} och ${awayTeam}${leagueName ? ` i ${leagueName}` : ''}${formattedDate ? ` - ${formattedDate}` : ''}.`;

        // Determine if this is an Östers IF match
        const isOstersMatch = homeTeam?.toLowerCase().includes('öster') || awayTeam?.toLowerCase().includes('öster');
        const titleSuffix = isOstersMatch ? ' - Östers IF' : ' - Fotbollsmatch';

        // Build canonical URL
        const canonicalPath = urlParams.length === 1
            ? `/matcher/${urlParams[0]}`
            : `/matcher/${leagueId}/${matchId}`;

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
            },
            alternates: {
                canonical: canonicalPath,
                languages: {
                    'sv-SE': canonicalPath,
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

// Server component - fetch data and pass to client
export default async function Page({ params }: PageProps) {
    const resolvedParams = await params;
    const urlParams = resolvedParams.params;

    // Validate params - must be 1 or 2 segments
    if (!urlParams || urlParams.length === 0 || urlParams.length > 2) {
        notFound();
    }

    // Fetch match data with CMS-first strategy
    const { matchDetails, lineupData, isCustomGame, leagueId, matchId } = await getMatchData(urlParams);

    if (!matchDetails) {
        notFound();
    }

    return (
        <MatchClient
            initialMatchDetails={matchDetails}
            initialLineupData={lineupData}
            leagueIdProp={leagueId}
            matchIdProp={matchId}
            isCustomGame={isCustomGame}
        />
    );
}
