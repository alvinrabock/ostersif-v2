"use server"

import { TruppPlayers } from "@/types";

/**
 * Fetch squad data from Superadmin API
 * Uses Next.js fetch cache with tag-based revalidation (same as nyheter)
 * Cached indefinitely, revalidated via webhook or on-demand
 */
export async function fetchSquadData() {
    // Add timeout to prevent hanging during build
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
        const res = await fetch(
            'https://api.sportomedia.se/v1/squad/OIF/2025?full=true',
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'x-api-key': process.env.SUPERADMIN_KEY || '',
                },
                signal: controller.signal,
                next: {
                    tags: ['squad', 'superadmin'], // Cache tags for revalidation
                },
            }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`Error fetching squad data: ${res.status} - ${res.statusText}`);
        }

        const data = await res.json();

        const squad: TruppPlayers[] = data.squad.filter((player: TruppPlayers) => {
            const matches = player.stats?.some((stat) => {
                return stat.teamName === "Östers IF";
            });
            return matches;
        });

        return squad;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Timeout fetching squad data');
        }
        throw error;
    }
}
