"use client";

import React, { useEffect, useState, useCallback } from "react";
import { MatchCardData } from "@/types";
import MatchCard from "@/app/components/Match/MatchCard";

interface KommandeMatcherClientProps {
    initialMatches: MatchCardData[];
}

/**
 * Client component that handles live match updates
 * Only fetches fresh data for live/in-progress matches
 */
export default function KommandeMatcherClient({ initialMatches }: KommandeMatcherClientProps) {
    const [matches, setMatches] = useState<MatchCardData[]>(initialMatches);

    // Check if any matches are live
    const hasLiveMatches = matches.some(m => m.status === "In progress");

    // Fetch live stats for in-progress matches
    const refreshLiveMatches = useCallback(async () => {
        const liveMatches = matches.filter(m => m.status === "In progress");
        if (liveMatches.length === 0) return;

        try {
            // Fetch live stats for each live match
            const updatedMatches = await Promise.all(
                liveMatches.map(async (match) => {
                    try {
                        const response = await fetch(`/api/match-live-stats?matchId=${match.matchId}&leagueId=${match.leagueId}`);
                        if (!response.ok) return match;

                        const liveStats = await response.json();
                        return { ...match, liveStats };
                    } catch {
                        return match;
                    }
                })
            );

            // Merge updated live matches with scheduled matches
            setMatches(prev => {
                const liveMatchIds = new Set(updatedMatches.map(m => m.matchId));
                const scheduledMatches = prev.filter(m => !liveMatchIds.has(m.matchId));
                return [...updatedMatches, ...scheduledMatches].sort(
                    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
                );
            });
        } catch (error) {
            console.error("Error refreshing live matches:", error);
        }
    }, [matches]);

    // Poll for live match updates every 30 seconds
    useEffect(() => {
        if (!hasLiveMatches) return;

        const interval = setInterval(refreshLiveMatches, 30000);
        return () => clearInterval(interval);
    }, [hasLiveMatches, refreshLiveMatches]);

    if (matches.length === 0) {
        return null;
    }

    return (
        <div className="w-full flex flex-col gap-4 z-20 relative">
            <h2 className="text-2xl font-bold text-white text-center mb-2 sr-only">
                Kommande matcher
            </h2>
            <div className="flex flex-col gap-4">
                {matches.map((match) => (
                    <MatchCard
                        key={match.matchId}
                        match={match}
                        colorTheme="red"
                    />
                ))}
            </div>
        </div>
    );
}
