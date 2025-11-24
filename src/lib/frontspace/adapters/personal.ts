/**
 * Personal (Staff) Adapter
 * Adapts Frontspace Personal type to match legacy Personal type from Payload
 */

import { frontspace } from '../client';
import type { Personal as FrontspacePersonal } from '../types';
import type { Personal } from '@/types';

/**
 * Transform Frontspace Personal to legacy Personal format
 */
function transformPersonal(personal: FrontspacePersonal): Personal {
  return {
    id: personal.id,
    slug: personal.slug,
    title: personal.namn,
    namn: personal.namn,
    befattning: personal.befattning,
    avdelning: personal.avdelning,
    bild: personal.bild ? {
      id: personal.bild.id,
      url: personal.bild.url,
      alt: personal.bild.alt || personal.namn,
      width: personal.bild.width,
      height: personal.bild.height,
    } : undefined,
    telefon: personal.telefon,
    epost: personal.epost,
    beskrivning: personal.beskrivning,
    visaPaHemsida: personal.visaPaHemsida || false,
    createdAt: personal.createdAt,
    updatedAt: personal.updatedAt,
  } as Personal;
}

/**
 * Fetch all staff members
 */
export async function fetchAllPersonal(limit = 100): Promise<Personal[]> {
  try {
    const { posts } = await frontspace.personal.getAll({ limit });
    return posts.map(transformPersonal);
  } catch (error) {
    console.error('Error fetching personal from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch single staff member by slug
 */
export async function fetchSinglePersonal(slug: string): Promise<Personal | null> {
  try {
    const personal = await frontspace.personal.getBySlug(slug);
    if (!personal) return null;

    return transformPersonal(personal);
  } catch (error) {
    console.error(`Error fetching personal ${slug} from Frontspace:`, error);
    return null;
  }
}

/**
 * Fetch staff members by department
 */
export async function fetchPersonalByAvdelning(avdelningSlug: string): Promise<Personal[]> {
  try {
    const { posts } = await frontspace.personal.getAll({
      filters: {
        'avdelning.slug': avdelningSlug,
      },
      limit: 100,
    });

    return posts.map(transformPersonal);
  } catch (error) {
    console.error(`Error fetching personal by avdelning ${avdelningSlug}:`, error);
    return [];
  }
}

/**
 * Fetch staff members for homepage
 */
export async function fetchHomepagePersonal(): Promise<Personal[]> {
  try {
    const { posts } = await frontspace.personal.getAll({
      filters: {
        visaPaHemsida: true,
      },
      limit: 100,
    });

    return posts.map(transformPersonal);
  } catch (error) {
    console.error('Error fetching homepage personal from Frontspace:', error);
    return [];
  }
}
