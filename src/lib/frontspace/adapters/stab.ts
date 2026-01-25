/**
 * Stab (Staff) Adapter
 * Fetches staff data from Frontspace CMS
 */

import { frontspace, fetchPosts } from '../client';

// Staff type based on Frontspace API response
export interface FrontspaceStabContent {
  bild?: string;
  roll?: string;
  epost?: string;
  telefon?: string;
  lag?: {
    id: string;
    title: string;
    slug: string;
  } | string;
}

export interface FrontspaceStab {
  id: string;
  title: string;
  slug: string;
  content: FrontspaceStabContent;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string;
}

/**
 * Transform raw Frontspace response to FrontspaceStab type
 */
function transformStab(stab: any): FrontspaceStab {
  return {
    id: stab.id,
    title: stab.title,
    slug: stab.slug,
    content: stab.content || {},
    status: stab.status,
    created_at: stab.created_at,
    updated_at: stab.updated_at,
    published_at: stab.published_at,
  };
}

/**
 * Fetch all staff members
 */
export async function fetchAllStab(limit = 100): Promise<FrontspaceStab[]> {
  try {
    const { posts } = await fetchPosts<any>('stab', { limit });
    return posts.map(transformStab);
  } catch (error) {
    console.error('Error fetching stab from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch staff by team ID
 * Uses server-side contentFilter to filter by lag relation field
 */
export async function fetchStabByTeam(teamId: string): Promise<FrontspaceStab[]> {
  try {
    // Use contentFilter to filter by lag relation field server-side
    const { posts } = await fetchPosts<any>('stab', {
      limit: 200,
      contentFilter: {
        lag: teamId,
      },
    });

    console.log(`[fetchStabByTeam] Found ${posts.length} staff members for team: ${teamId}`);

    return posts.map(transformStab);
  } catch (error) {
    console.error(`Error fetching stab by team ${teamId}:`, error);
    return [];
  }
}

/**
 * Fetch single staff member by slug
 */
export async function fetchSingleStab(slug: string): Promise<FrontspaceStab | null> {
  try {
    const stab = await frontspace.stab?.getBySlug?.(slug);
    if (!stab) return null;

    return transformStab(stab);
  } catch (error) {
    console.error(`Error fetching stab ${slug} from Frontspace:`, error);
    return null;
  }
}
