import React from "react";
import { getLeaguesGroupedBySeason, getLeagueCache } from "@/lib/leagueCache";
import { getMatchesWithFallback } from "@/lib/getMatchesWithFallback";
import { getAllMatchesWithTieredCache } from "@/lib/matchCache";
import { MatchCardData } from "@/types";
import KommandeMatcherClient from "./KommandeMatcherClient";

interface KommandeMatcherServerProps {
    maxMatches?: number;
}

/**
 * Server Component that fetches upcoming matches from CMS
 * Uses the exact same fetch logic as /matcher page
 */
export default async function KommandeMatcherServer({ maxMatches = 3 }: KommandeMatcherServerProps) {
    try {
        // Same as /matcher/page.tsx: fetch seasons + league cache in parallel
        const [seasons, leagueCache] = await Promise.all([
            getLeaguesGroupedBySeason(),
            getLeagueCache(),
        ]);

        if (!seasons || seasons.length === 0) return null;

        // Get current season league IDs (same logic as /matcher)
        const currentYear = new Date().getFullYear().toString();
        const currentSeason = seasons.find(s => s.seasonYear === currentYear)?.seasonYear || seasons[0]?.seasonYear;
        const currentSeasonLeagues = seasons.find(s => s.seasonYear === currentYear)?.tournaments || seasons[0]?.tournaments || [];
        const leagueIds = currentSeasonLeagues.map(t => t.leagueId);
        const teamId = leagueCache?.teamId;

        // CMS-first with season filtering (same as /matcher)
        let allMatches: MatchCardData[] = [];
        const cmsMatches = await getMatchesWithFallback({
            leagueIds,
            teamId,
            limit: 200,
            season: currentSeason,
        });

        if (cmsMatches && cmsMatches.length > 0) {
            allMatches = cmsMatches;
        } else if (leagueIds.length > 0 && teamId) {
            // Fallback to tiered cache (SMC-based system)
            const { all } = await getAllMatchesWithTieredCache(leagueIds, teamId);
            allMatches = all;
        }

        // Filter upcoming matches
        const today = new Date().toISOString().split('T')[0];
        const upcomingMatches = allMatches
            .filter(m => {
                if (m.status === 'Over') return false;
                const kickoffDate = m.kickoff?.split('T')[0] || '';
                return kickoffDate >= today;
            })
            .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
            .slice(0, maxMatches);

        // Build league name + gender maps from turneringar (same as MatchArchiveClient)
        const leagueNameMap: Record<string, string> = {};
        const leagueGenderMap: Record<string, 'Herrar' | 'Damer'> = {};

        for (const s of seasons) {
            for (const t of s.tournaments) {
                const label = t.kon === 'dam' ? 'Damer' as const : 'Herrar' as const;
                leagueNameMap[String(t.leagueId)] = t.LeagueName;
                leagueGenderMap[String(t.leagueId)] = label;
                t.altLeagueIds?.forEach(id => {
                    leagueNameMap[id] = t.LeagueName;
                    leagueGenderMap[id] = label;
                });
            }
        }

        return (
            <KommandeMatcherClient
                initialMatches={upcomingMatches}
                leagueNameMap={leagueNameMap}
                leagueGenderMap={leagueGenderMap}
            />
        );
    } catch (error) {
        console.error("Error fetching upcoming matches:", error);
        return null;
    }
}
