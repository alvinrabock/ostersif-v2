import { SuperAdminTeamStats } from "@/types";
import { getCurrentSeason } from "@/lib/season";

/**
 * Fetch team stats from Superadmin API
 * Uses Next.js fetch cache with tag-based revalidation (same as nyheter)
 * Cached indefinitely, revalidated via webhook or on-demand
 *
 * @param season - Optional season year (e.g., "2025"). Defaults to current season.
 */
export async function fetchTeamStats(season?: string): Promise<SuperAdminTeamStats | null> {
    const targetSeason = season || getCurrentSeason();

    // Add timeout to prevent hanging during build
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
        const res = await fetch(
            `https://api.sportomedia.se/v1/statistics/teams/allsvenskan/${targetSeason}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'x-api-key': process.env.SUPERADMIN_KEY || '',
                },
                signal: controller.signal,
                next: {
                    tags: ['team-stats', 'superadmin'], // Cache tags for revalidation
                },
            }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`Failed to fetch team stats: ${res.status}`);
            return null;
        }

        const allTeams: SuperAdminTeamStats[] = await res.json();

        const ostersIf = allTeams.find((team) => team.smcId === 19);

        return ostersIf || null;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            console.error('Timeout fetching team stats');
        } else {
            console.error('Error fetching team stats:', error);
        }
        return null;
    }
}