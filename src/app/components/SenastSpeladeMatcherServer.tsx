import React from "react";
import { getMatches } from "@/lib/fetchMatches";
import { getLeagueCache } from "@/lib/leagueCache";
import SenastSpeladeMatcherClient from "./SenastSpeladeMatcherClient";

interface SenastSpeladeMatcherServerProps {
    maxMatches?: number;
}

/**
 * Server Component that pre-fetches played matches in a grid layout
 * Data is static (finished matches don't change), passed to client for rendering
 */
export default async function SenastSpeladeMatcherServer({ maxMatches = 4 }: SenastSpeladeMatcherServerProps) {
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

        // Filter to finished matches only, sorted by most recent first
        const filteredMatches = data
            .filter((match) => match.status === "Over")
            .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
            .slice(0, maxMatches);

        if (filteredMatches.length === 0) {
            return null;
        }

        // Pass pre-fetched data to client component for rendering
        return <SenastSpeladeMatcherClient matches={filteredMatches} />;
    } catch (error) {
        console.error("Error fetching played matches:", error);
        return null;
    }
}
