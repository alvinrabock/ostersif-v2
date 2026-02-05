import React from "react";
import { getUpcomingMatches } from "@/lib/getMatchesWithFallback";
import KommandeMatcherClient from "./KommandeMatcherClient";

interface KommandeMatcherServerProps {
    maxMatches?: number;
}

/**
 * Server Component that fetches upcoming matches from CMS
 * Passes data to client component for live updates
 */
export default async function KommandeMatcherServer({ maxMatches = 3 }: KommandeMatcherServerProps) {
    try {
        // Fetch upcoming matches from CMS (server-side, already filtered)
        const matches = await getUpcomingMatches(maxMatches);

        // Pass pre-fetched data to client component
        return <KommandeMatcherClient initialMatches={matches} />;
    } catch (error) {
        console.error("Error fetching upcoming matches:", error);
        return null;
    }
}
