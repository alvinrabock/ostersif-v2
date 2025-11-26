/**
 * Lag (Teams) Adapter
 * Fetches team data from Frontspace CMS
 */

import { frontspace } from '../client';

// Frontspace Lag type based on actual API response
export interface FrontspaceLagContent {
  omslagsbild?: string;
  traningstillfallen?: string;
  spelare?: string;
  stab?: string;
  sportadminlank?: string;
  lanka_helt_till_sportadmin?: string | boolean;
  fetchfromsefapi?: boolean;
}

export interface FrontspaceLag {
  id: string;
  title: string;
  slug: string;
  content: FrontspaceLagContent;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string;
}

/**
 * Transform raw Frontspace response to FrontspaceLag type
 */
function transformLag(lag: any): FrontspaceLag {
  return {
    id: lag.id,
    title: lag.title,
    slug: lag.slug,
    content: lag.content || {},
    status: lag.status,
    created_at: lag.created_at,
    updated_at: lag.updated_at,
    published_at: lag.published_at,
  };
}

/**
 * Fetch all teams
 */
export async function fetchAllLag(limit = 100): Promise<FrontspaceLag[]> {
  try {
    const { posts } = await frontspace.lag.getAll({ limit });
    return posts.map(transformLag);
  } catch (error) {
    console.error('Error fetching lag from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch single team by slug
 */
export async function fetchSingleLag(slug: string): Promise<FrontspaceLag | null> {
  try {
    const lag = await frontspace.lag.getBySlug(slug);
    if (!lag) return null;

    return transformLag(lag);
  } catch (error) {
    console.error(`Error fetching lag ${slug} from Frontspace:`, error);
    return null;
  }
}
