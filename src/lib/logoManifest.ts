/**
 * Logo manifest - maps team slugs to their available format
 * This avoids 404 errors from trying formats that don't exist
 *
 * To regenerate: Run `ls public/logos/` and update this map
 */

export type LogoFormat = 'svg' | 'png' | 'webp';

// Map of team slug (from lowercase utility) to available format
const logoManifest: Record<string, LogoFormat> = {
  'afc-eskilstuna': 'svg',
  'aik': 'svg',
  'bk-hacken': 'svg',
  'dalkurd': 'svg',
  'degerfors-if': 'svg',
  'djurgarden': 'svg',
  'falkenbergs-ff': 'png',
  'gais': 'svg',
  'gif-sundsvall': 'svg',
  'halmstad': 'svg',
  'hammarby': 'svg',
  'helsingborgs-if': 'png',
  'if-brommapojkarna': 'svg',
  'if-elfsborg': 'svg',
  'ifk-goteborg': 'svg',
  'ifk-norrkoping-fk': 'svg',
  'ifk-varnamo': 'svg',
  'ik-brage': 'svg',
  'ik-oddevold': 'webp',
  'ik-sirius-fk': 'svg',
  'jonkoping-sodra': 'svg',
  'landskrona-bois': 'svg',
  'ljungskile-sk-herrfotboll': 'webp',
  'malmo-ff': 'svg',
  'mjallby-aif': 'svg',
  'nordic-united-fc': 'webp',
  'norrby-if': 'svg',
  'orebro-sk': 'svg',
  'orebro': 'webp',
  'orgryte-is-fotboll': 'svg',
  'osters-if': 'svg',
  'ostersund': 'png',
  'ostersunds-fk': 'svg',
  'sandvikens-if': 'svg',
  'skovde-aik': 'svg',
  'trelleborgs-ff': 'svg',
  'utsiktens-bk': 'svg',
  'varbergs-bois-fc': 'png',
  'vasteras-logotype': 'svg',
};

/**
 * Get the correct logo path for a team
 * Returns the path if logo exists in manifest, otherwise null
 */
export function getKnownLogoPath(teamSlug: string): string | null {
  const format = logoManifest[teamSlug];
  if (format) {
    return `/logos/${teamSlug}.${format}`;
  }
  return null;
}

/**
 * Check if a team has a known logo
 */
export function hasKnownLogo(teamSlug: string): boolean {
  return teamSlug in logoManifest;
}

/**
 * Get the format for a team logo
 */
export function getLogoFormat(teamSlug: string): LogoFormat | null {
  return logoManifest[teamSlug] || null;
}

export default logoManifest;
