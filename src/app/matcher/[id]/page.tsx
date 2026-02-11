// app/matcher/[id]/page.tsx
// Route for custom games and matches accessed by CMS ID/slug
import { getMatchById } from "@/lib/getMatchesWithFallback";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from 'next';
import CustomMatchClient from "./CustomMatchClient";
import { cache } from 'react';
import { Match } from '@/types';

// Use dynamic rendering for fresh data
export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ id: string }>;
};

// Cache the CMS match fetch within a single request
const getCachedCMSMatch = cache(getMatchById);

// Generate dynamic metadata for custom games
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
        return {
            title: 'Match inte hittad - Östers IF',
            description: 'Den begärda matchen kunde inte hittas.',
        };
    }

    try {
        const cmsMatch = await getCachedCMSMatch(id);

        if (!cmsMatch) {
            return {
                title: 'Match inte hittad - Östers IF',
                description: 'Den begärda matchen kunde inte hittas.',
            };
        }

        const { homeTeam, awayTeam, kickoff, leagueName } = cmsMatch;

        // Format match date
        const formatMatchDate = (dateString: string) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
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
            if (isNaN(date.getTime())) return '';
            return date.getFullYear().toString();
        };

        const matchYear = getYearFromDate(kickoff);

        // Create match title
        const baseMatchTitle = `${homeTeam} - ${awayTeam}`;
        const leagueAndYear = [leagueName, matchYear].filter(Boolean).join(' ');
        const matchTitle = leagueAndYear ? `${baseMatchTitle} - ${leagueAndYear}` : baseMatchTitle;

        const description = `Match mellan ${homeTeam} och ${awayTeam}${leagueName ? ` i ${leagueName}` : ''}${formattedDate ? ` - ${formattedDate}` : ''}.`;

        return {
            title: `${matchTitle} - Östers IF`,
            description,
            openGraph: {
                title: `${matchTitle} - Östers IF`,
                description,
                type: 'website',
                locale: 'sv_SE',
                siteName: 'Östers IF',
            },
            alternates: {
                canonical: `/matcher/${id}`,
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

export default async function Page({ params }: PageProps) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
        notFound();
    }

    // Fetch match from CMS
    const cmsMatch = await getCachedCMSMatch(id);

    if (!cmsMatch) {
        notFound();
    }

    // If match has SMC data (leagueId and externalMatchId), redirect to full URL
    // This ensures proper handling for matches that exist in both systems
    if (cmsMatch.leagueId && cmsMatch.externalMatchId && !cmsMatch.isCustomGame) {
        redirect(`/matcher/${cmsMatch.leagueId}/${cmsMatch.externalMatchId}`);
    }

    // Convert CMS MatchCardData to Match type for display
    const matchDetails: Match = {
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
        // Custom game specific fields
        homeTeamLogo: cmsMatch.homeTeamLogo,
        awayTeamLogo: cmsMatch.awayTeamLogo,
    } as Match;

    return <CustomMatchClient matchDetails={matchDetails} />;
}
