"use client";

import React, { useEffect, useState, useMemo } from "react";
import MatchCard from "@/app/components/Match/MatchCard";
import { Button } from "@/app/components/ui/Button";
import Link from "next/link";
import { getMatches } from "@/lib/fetchMatches";
import { fetchTeamsWithSMC } from "@/lib/apollo/fetchTeam/fetchTeamForMatchesAction";
import { Lag, MatchCardData } from "@/types";
import { MatchCardSkeleton } from "@/app/components/Skeletons/MatchCardSkeleton";

// Move skeleton array outside component to prevent recreation
const skeletonArray = Array(3).fill(null);

export default function KommandeMatcherBlock() {
    const [matches, setMatches] = useState<MatchCardData[] | null>(null);
    const [teamsWithSEF, setTeamsWithSEF] = useState<Lag[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        // Move extractLeagueIds inside useEffect to avoid dependency issues
        const extractLeagueIds = (teams: Lag[]): number[] => {
            const leagueIdsSet = new Set<number>();
            
            for (const team of teams) {
                if (team.seasons) {
                    for (const season of team.seasons) {
                        if (season.tournaments) {
                            for (const tournament of season.tournaments) {
                                if (tournament.leagueId) {
                                    leagueIdsSet.add(Number(tournament.leagueId));
                                }
                            }
                        }
                    }
                }
            }
            
            return Array.from(leagueIdsSet);
        };

        async function fetchData() {
            try {
                console.log("🚀 Starting fetch process...");
                const startTime = Date.now();

                // Time the teams fetch
                console.log("📡 Fetching teams...");
                const teamsFetchStart = Date.now();
                const fetchedTeams = await fetchTeamsWithSMC();
                console.log(`✅ Teams fetched in ${Date.now() - teamsFetchStart}ms`);

                if (!isMounted) return;

                if (!fetchedTeams || fetchedTeams.length === 0) {
                    console.log("❌ No teams found");
                    if (isMounted) {
                        setError("Inga SEF-lag hittades.");
                        setMatches([]);
                    }
                    return;
                }

                setTeamsWithSEF(fetchedTeams);

                // Time the league ID extraction
                console.log("🔍 Extracting league IDs...");
                const extractStart = Date.now();
                const leagueIds = extractLeagueIds(fetchedTeams);
                console.log(`✅ League IDs extracted in ${Date.now() - extractStart}ms:`, leagueIds);

                const smcTeamId = fetchedTeams[0]?.smcTeamId;
                console.log("🏷️ SMC Team ID:", smcTeamId);

                if (!smcTeamId) {
                    console.log("❌ Invalid smcTeamId");
                    if (isMounted) {
                        setError("Ogiltigt smcTeamId.");
                        setMatches([]);
                    }
                    return;
                }

                // Time the matches fetch
                console.log("📡 Fetching matches...");
                const matchesFetchStart = Date.now();
                const data = await getMatches(leagueIds, smcTeamId, smcTeamId);
                console.log(`✅ Matches fetched in ${Date.now() - matchesFetchStart}ms`);
                
                console.log(`🎉 Total process completed in ${Date.now() - startTime}ms`);

                if (isMounted) {
                    setMatches(data);
                }
            } catch (err) {
                console.error("💥 Error during fetch:", err);
                if (isMounted) {
                    setError("Kunde inte ladda matcher.");
                    setMatches([]);
                }
            }
        }

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []); // Empty dependency array - only runs once on mount

    // Memoize match cards with dependency optimization
    const renderedMatchCards = useMemo(() => {
        if (!matches || !teamsWithSEF) return null;

        // Filter out finished matches (status "Over") and only take the first 3 upcoming matches
        const upcomingMatches = matches
            .filter(match => match.status !== "Over")
            .slice(0, 3);

        return upcomingMatches.map((match, index) => (
            <MatchCard
                key={match.matchId}
                match={match}
                colorTheme={index === 0 ? "red" : "outline"}
                teamsWithSEF={teamsWithSEF}
            />
        ));
    }, [matches, teamsWithSEF]);

    // Memoize loading state
    const isLoading = matches === null || teamsWithSEF === null;
    
    // Memoize skeleton elements
    const skeletonElements = useMemo(() => (
        <div className="flex flex-col gap-4 py-20">
            {skeletonArray.map((_, index) => (
                <MatchCardSkeleton key={`skeleton-${index}`} />
            ))}
        </div>
    ), []);

    // Memoize error state
    const errorElement = useMemo(() => (
        <div className="bg-red-500 text-white p-4 rounded-md text-center">
            {error}
        </div>
    ), [error]);

    // Memoize no matches state
    const noMatchesElement = useMemo(() => (
        <div className="bg-red-500 text-white p-4 rounded-md text-center">
            Inga matcher ligger publicerade
        </div>
    ), []);

    // Memoize button
    const showScheduleButton = useMemo(() => {
        if (!matches) return null;

        // Check if there are any upcoming matches
        const hasUpcomingMatches = matches.some(match => match.status !== "Over");
        if (!hasUpcomingMatches) return null;

        return (
            <Link href="/matcher">
                <Button variant="outline" className="w-full my-6 text-white">
                    Visa spelschema
                </Button>
            </Link>
        );
    }, [matches]);

    return (
        <div className="w-full flex flex-col gap-4 z-20 relative">
            <h2 className="text-2xl font-bold text-white text-center mb-2 sr-only">
                Kommande matcher
            </h2>

            {isLoading ? (
                skeletonElements
            ) : error ? (
                errorElement
            ) : matches.length === 0 || matches.every(match => match.status === "Over") ? (
                noMatchesElement
            ) : (
                <div className="flex flex-col gap-4">{renderedMatchCards}</div>
            )}

            {showScheduleButton}
        </div>
    );
}