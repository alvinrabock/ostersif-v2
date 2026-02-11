"use client";

import React, { useEffect, useState } from "react";
import { MatchCardData } from "@/types";
import { getMatches } from "@/lib/fetchMatches";
import MatchCard from "@/app/components/Match/MatchCard";
import { MatchCardSkeleton } from "@/app/components/Skeletons/MatchCardSkeleton";
import { useLeagueData } from "@/lib/hooks/useLeagueData";

interface KommandeMatcherProps {
    maxMatches?: number;
    initialMatches?: MatchCardData[];
}

export default function KommandeMatcher({ maxMatches = 3, initialMatches }: KommandeMatcherProps) {
    const [matches, setMatches] = useState<MatchCardData[]>(initialMatches || []);
    const [matchError, setMatchError] = useState<string | null>(null);
    const [isLoadingMatches, setIsLoadingMatches] = useState(!initialMatches);

    // Use shared league data hook
    const { data: leagueData, loading: leagueLoading, error: leagueError } = useLeagueData();

    useEffect(() => {
        async function fetchData() {
            // Skip fetching if we have initial data from server
            if (initialMatches && initialMatches.length > 0) {
                return;
            }

            // Wait for league data to load
            if (leagueLoading || !leagueData) {
                return;
            }

            setIsLoadingMatches(true);

            try {
                const { teamId, leagues } = leagueData;

                // Get current year for latest season
                const currentYear = new Date().getFullYear().toString();

                // Get leagues from latest season (current year)
                const latestSeasonLeagues = leagues.filter((l: any) => l.seasonYear === currentYear);

                // If no leagues for current year, use most recent season
                const seasonsAvailable = [...new Set(leagues.map((l: any) => l.seasonYear))].sort((a: string, b: string) => Number(b) - Number(a));
                const targetSeason = latestSeasonLeagues.length > 0 ? currentYear : seasonsAvailable[0];
                const targetLeagues = leagues.filter((l: any) => l.seasonYear === targetSeason);

                if (targetLeagues.length === 0) {
                    setMatchError("Inga ligor hittades för aktuell säsong.");
                    setMatches([]);
                    return;
                }

                // Extract league IDs and use the first league's team ID
                const leagueIds = targetLeagues.map((l: any) => String(l.leagueId));
                const smcTeamId = targetLeagues[0]?.ostersTeamId || teamId;

                if (!smcTeamId) {
                    setMatchError("Ogiltigt lag-ID.");
                    setMatches([]);
                    return;
                }

                const homeTeamId = smcTeamId;
                const awayTeamId = smcTeamId;

                const data = await getMatches(leagueIds, homeTeamId, awayTeamId);

                const now = new Date();

                const filteredMatches = data
                    .filter((match) => {
                        // Include scheduled matches and in-progress matches
                        if (match.status === "Scheduled" || match.status === "In progress") {
                            // For scheduled matches, ensure kickoff is in the future
                            if (match.status === "Scheduled") {
                                const kickoffDate = new Date(match.kickoff);
                                return kickoffDate > now;
                            }
                            return true; // Always include in-progress matches
                        }
                        return false;
                    })
                    .sort(
                        (a, b) =>
                            new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
                    )
                    .slice(0, maxMatches);

                setMatches(filteredMatches);
            } catch (err) {
                console.error("Error fetching upcoming matches:", err);
                setMatchError("Kunde inte ladda matcher.");
                setMatches([]);
            } finally {
                setIsLoadingMatches(false);
            }
        }

        fetchData();
    }, [maxMatches, leagueLoading, leagueData, initialMatches]);

    // Show skeletons while loading (skip if we have initial data)
    if (!initialMatches && (leagueLoading || isLoadingMatches)) {
        return (
            <div className="w-full flex flex-col gap-4 z-20 relative">
                <h2 className="text-2xl font-bold text-white text-center mb-2 sr-only">
                    Kommande matcher
                </h2>
                <div className="flex flex-col gap-4">
                    {[...Array(3)].map((_, i) => (
                        <MatchCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    // If no matches available after loading, display nothing
    if (matches.length === 0 && !matchError && !leagueError) {
        return null;
    }

    // Show error if there is one
    if (matchError || leagueError) {
        return (
            <div className="w-full flex flex-col gap-4 z-20 relative">
                <div className="bg-red-500 text-white p-4 rounded-md text-center">
                    {matchError || leagueError}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4 z-20 relative">
            <h2 className="text-2xl font-bold text-white text-center mb-2 sr-only">
                Kommande matcher
            </h2>
            <div className="flex flex-col gap-4">
                {matches.map((match) => (
                    <MatchCard
                        key={match.cmsId || match.externalMatchId || match.matchId}
                        match={match}
                        colorTheme="red"
                    />
                ))}
            </div>
        </div>
    );
}
