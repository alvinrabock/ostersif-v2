import { lowercase } from "@/utillities/lowercase";

// Supported logo formats in order of preference
export const LOGO_FORMATS = ['svg', 'png'] as const;
export type LogoFormat = typeof LOGO_FORMATS[number];

export const getTeamLogoPath = (teamName: string, format: LogoFormat = 'svg') => {
    const formattedName = lowercase(teamName);
    return `/logos/${formattedName}.${format}`;
};