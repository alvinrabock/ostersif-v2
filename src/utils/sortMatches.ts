import type { MatchCardData } from "@/types";

/**
 * Sort matches consistently across the site
 * Priority: Live (In progress) → Scheduled → Over
 * Within status: upcoming by soonest first, played by most recent first
 */
export function sortMatches(matches: MatchCardData[]): MatchCardData[] {
    return [...matches].sort((a, b) => {
        const statusPriority: Record<string, number> = {
            'In progress': 0,
            'Scheduled': 1,
            'Over': 2,
        };
        const statusDiff = (statusPriority[a.status] ?? 1) - (statusPriority[b.status] ?? 1);
        if (statusDiff !== 0) return statusDiff;

        // For "Over" matches: most recent first
        if (a.status === 'Over') {
            return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
        }
        // For "Scheduled" and "In progress": soonest first
        return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
    });
}
