import React from "react";
import { getMatches } from "@/lib/fetchMatches";
import { getLeagueCache } from "@/lib/leagueCache";
import KommandeMatcherClient from "./KommandeMatcherClient";
import { MatchCardSkeleton } from "@/app/components/Skeletons/MatchCardSkeleton";

interface KommandeMatcherServerProps {
    maxMatches?: number;
}

/**
 * Server Component that pre-fetches upcoming matches
 * Passes data to client component for live updates
 */
export default async function KommandeMatcherServer({ maxMatches = 3 }: KommandeMatcherServerProps) {
    try {
        // Get league data from cache (server-side)
        const leagueData = await getLeagueCache();

        if (!leagueData) {
            console.error("No league data found in cache");
            return null;
        }

        const { teamId, leagues } = leagueData;

        // Get current year for latest season
        const currentYear = new Date().getFullYear().toString();

        // Get leagues from latest season (current year)
        const latestSeasonLeagues = leagues.filter((l) => l.seasonYear === currentYear);

        // If no leagues for current year, use most recent season
        const seasonsAvailable = [...new Set(leagues.map((l) => l.seasonYear))].sort(
            (a, b) => Number(b) - Number(a)
        );
        const targetSeason = latestSeasonLeagues.length > 0 ? currentYear : seasonsAvailable[0];
        const targetLeagues = leagues.filter((l) => l.seasonYear === targetSeason);

        if (targetLeagues.length === 0) {
            console.error("No leagues found for target season");
            return null;
        }

        // Extract league IDs and use the first league's team ID
        const leagueIds = targetLeagues.map((l) => String(l.leagueId));
        const smcTeamId = targetLeagues[0]?.ostersTeamId || teamId;

        if (!smcTeamId) {
            console.error("Invalid team ID");
            return null;
        }

        // Fetch matches server-side
        const data = await getMatches(leagueIds, smcTeamId, smcTeamId);

        const now = new Date();

        // Filter to upcoming and live matches
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
            .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
            .slice(0, maxMatches);

        if (filteredMatches.length === 0) {
            return null;
        }

        // Pass pre-fetched data to client component
        return <KommandeMatcherClient initialMatches={filteredMatches} />;
    } catch (error) {
        console.error("Error fetching upcoming matches:", error);
        return (
            <div className="w-full flex flex-col gap-4 z-20 relative">
                <div className="flex flex-col gap-4">
                    {[...Array(3)].map((_, i) => (
                        <MatchCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }
}
