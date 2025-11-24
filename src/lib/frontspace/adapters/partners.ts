/**
 * Partners Adapter
 * Adapts Frontspace Partner type to match legacy Partner type from Payload
 */

import { frontspace } from '../client';
import type { Partner as FrontspacePartner } from '../types';
import type { Partner } from '@/types';

/**
 * Transform Frontspace Partner to legacy Partner format
 */
function transformPartner(partner: any): Partner {
  // Parse content if it's a string
  let content = partner.content || {};
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse partner content:', e);
      content = {};
    }
  }

  // Handle logotype - it can be a string URL or an object
  let logotyp: any = undefined;
  if (typeof content.logotype === 'string') {
    logotyp = {
      id: partner.id,
      url: content.logotype,
      alt: partner.title || '',
      width: null,
      height: null,
    };
  } else if (content.logotype && typeof content.logotype === 'object') {
    logotyp = {
      id: content.logotype.id,
      url: content.logotype.url,
      alt: content.logotype.alt || partner.title,
      width: content.logotype.width,
      height: content.logotype.height,
    };
  }

  return {
    id: partner.id,
    slug: partner.slug,
    title: partner.title,
    namn: partner.title,
    logotyp,
    beskrivning: content.beskrivning || '',
    webbplats: content.hemsida || content.webbplats || '',
    partnerniva: content.partnerniva || '',
    paket: [],
    visaPaHemsida: content.partner_till_oster_i_samhallet || false,
    ordning: 0,
    createdAt: partner.created_at,
    updatedAt: partner.updated_at,
  } as Partner;
}

/**
 * Fetch all partners
 */
export async function fetchAllPartners(limit = 100): Promise<Partner[]> {
  try {
    const { posts } = await frontspace.partners.getAll({
      limit,
      sort: 'ordning',
    });

    return posts.map(transformPartner);
  } catch (error) {
    console.error('Error fetching partners from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch single partner by slug
 */
export async function fetchSinglePartner(slug: string): Promise<Partner | null> {
  try {
    const partner = await frontspace.partners.getBySlug(slug);
    if (!partner) return null;

    return transformPartner(partner);
  } catch (error) {
    console.error(`Error fetching partner ${slug} from Frontspace:`, error);
    return null;
  }
}

/**
 * Fetch partners for homepage
 */
export async function fetchHomepagePartners(): Promise<Partner[]> {
  try {
    const { posts } = await frontspace.partners.getAll({
      filters: {
        visaPaHemsida: true,
      },
      sort: 'ordning',
      limit: 100,
    });

    return posts.map(transformPartner);
  } catch (error) {
    console.error('Error fetching homepage partners from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch partners by level
 */
export async function fetchPartnersByLevel(levelSlug: string): Promise<Partner[]> {
  try {
    const { posts } = await frontspace.partners.getAll({
      filters: {
        'partnerniva.slug': levelSlug,
      },
      sort: 'ordning',
      limit: 100,
    });

    return posts.map(transformPartner);
  } catch (error) {
    console.error(`Error fetching partners by level ${levelSlug}:`, error);
    return [];
  }
}

/**
 * Fetch Huvudpartners (main partners)
 * Filters by partnerniva = "Huvudpartner" using GraphQL contentFilter
 */
export async function fetchHuvudpartners(): Promise<Partner[]> {
  try {
    console.log('🔍 Fetching huvudpartners with contentFilter: { partnerniva: "Huvudpartner" }');

    const { posts } = await frontspace.partners.getAll({
      contentFilter: {
        partnerniva: 'Huvudpartner',
      },
      sort: 'title',
      limit: 100,
    });

    console.log(`✅ Fetched ${posts.length} huvudpartners from API using contentFilter`);

    if (posts.length > 0) {
      console.log('First partner:', {
        title: posts[0].title,
        content: posts[0].content,
      });
    }

    const transformed = posts.map(transformPartner);
    console.log('Transformed partners:', transformed.map(p => ({ title: p.title, partnerniva: p.partnerniva, hasLogo: !!p.logotyp })));

    return transformed;
  } catch (error) {
    console.error('Error fetching huvudpartners from Frontspace:', error);
    return [];
  }
}
