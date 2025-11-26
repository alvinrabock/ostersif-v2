/**
 * Lag (Teams) Adapter
 * Adapts Frontspace Lag type to match legacy Team type from Payload
 */

import { frontspace } from '../client';
import type { Lag as FrontspaceLag } from '../types';
import type { Lag } from '@/types';

/**
 * Transform Frontspace Lag to legacy Lag format
 */
function transformLag(lag: FrontspaceLag): Lag {
  return {
    id: lag.id,
    slug: lag.slug,
    title: lag.namn,
    namn: lag.namn,
    argang: lag.argang,
    kon: lag.kon,
    liga: lag.liga,
    lagbild: lag.lagbild ? {
      id: lag.lagbild.id,
      url: lag.lagbild.url,
      alt: lag.lagbild.alt || lag.namn,
      width: lag.lagbild.width,
      height: lag.lagbild.height,
    } : undefined,
    truppbild: lag.truppbild ? {
      id: lag.truppbild.id,
      url: lag.truppbild.url,
      alt: lag.truppbild.alt || `${lag.namn} trupp`,
      width: lag.truppbild.width,
      height: lag.truppbild.height,
    } : undefined,
    beskrivning: lag.beskrivning,
    matcher: lag.matcher || [],
    spelare: lag.spelare || [],
    ledare: lag.ledare || [],
    createdAt: lag.createdAt,
    updatedAt: lag.updatedAt,
  } as Lag;
}

/**
 * Fetch all teams
 */
export async function fetchAllLag(limit = 100): Promise<Lag[]> {
  try {
    const { posts } = await frontspace.lag.getAll({ limit });
    return (posts as FrontspaceLag[]).map(transformLag);
  } catch (error) {
    console.error('Error fetching lag from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch single team by slug
 */
export async function fetchSingleLag(slug: string): Promise<Lag | null> {
  try {
    const lag = await frontspace.lag.getBySlug(slug);
    if (!lag) return null;

    return transformLag(lag as FrontspaceLag);
  } catch (error) {
    console.error(`Error fetching lag ${slug} from Frontspace:`, error);
    return null;
  }
}

/**
 * Fetch teams by gender
 */
export async function fetchLagByKon(kon: 'herr' | 'dam'): Promise<Lag[]> {
  try {
    const { posts } = await frontspace.lag.getAll({
      filters: { kon },
      limit: 100,
    });

    return (posts as FrontspaceLag[]).map(transformLag);
  } catch (error) {
    console.error(`Error fetching lag by kon ${kon}:`, error);
    return [];
  }
}
