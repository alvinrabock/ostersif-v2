/**
 * Season utility functions for Swedish football (Allsvenskan)
 *
 * Swedish football seasons run from spring to fall within a single calendar year.
 * - Season typically starts in April and ends in November
 * - During Jan-Mar, we're in the off-season and should show previous year's data
 */

/** Get the current season based on date */
export function getCurrentSeason(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // If before April (off-season), show previous year's season
    if (month < 4) {
        return String(year - 1);
    }

    return String(year);
}

/** Get available seasons for the dropdown - current and previous few years */
export function getAvailableSeasons(): string[] {
    const currentYear = new Date().getFullYear();
    const seasons: string[] = [];

    // Include current year and 2 previous years
    for (let i = 0; i < 3; i++) {
        seasons.push(String(currentYear - i));
    }

    return seasons;
}

/** Get the default season to show (same as current) */
export function getDefaultSeason(): string {
    return getCurrentSeason();
}

/** Validate a season string */
export function isValidSeason(season: string | undefined): boolean {
    if (!season) return false;
    const year = parseInt(season, 10);
    const currentYear = new Date().getFullYear();
    // Valid if it's a 4-digit year between 2020 and next year
    return !isNaN(year) && year >= 2020 && year <= currentYear + 1;
}
