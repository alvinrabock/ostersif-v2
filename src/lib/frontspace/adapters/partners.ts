/**
 * Partners Adapter
 * Adapts Frontspace Partner type to match legacy Partner type from Payload
 */

import { frontspace, fetchPosts } from '../client';
import type { Partner as _FrontspacePartner } from '../types';
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
  // Try multiple field names: logotype, logotyp, logo
  let logotyp: any = undefined;
  const logoField = content.logotype || content.logotyp || content.logo;

  if (typeof logoField === 'string') {
    logotyp = {
      id: partner.id,
      url: logoField,
      alt: partner.title || '',
      width: null,
      height: null,
    };
  } else if (logoField && typeof logoField === 'object') {
    logotyp = {
      id: logoField.id,
      url: logoField.url,
      alt: logoField.alt || partner.title,
      width: logoField.width,
      height: logoField.height,
    };
  }

  return {
    id: partner.id,
    slug: partner.slug,
    title: partner.title,
    namn: partner.title,
    logotyp,
    logotype: logotyp,
    link: content.hemsida || content.webbplats || '',
    webbplats: content.hemsida || content.webbplats || '',
    beskrivning: content.beskrivning || '',
    partnerniva: content.partnerniva || '',
    partnernivaer: content.partnerniva || '',
    paket: [],
    visaPaHemsida: content.partner_till_oster_i_samhallet || false,
    ordning: partner.sort_order ?? 0,
    sortOrder: partner.sort_order ?? 999,
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
 * Queries directly by partnerniva UUID using contentFilter
 */
export async function fetchHuvudpartners(): Promise<Partner[]> {
  // Known UUID for "Huvudpartner" partnernivå
  const HUVUDPARTNER_UUID = 'eaf356ff-2d48-4c85-91e5-de39ea0dc485';

  try {
    const { posts } = await frontspace.partners.getAllWithRelations({
      limit: 100,
      contentFilter: {
        partnerniva: HUVUDPARTNER_UUID,
      },
    });

    return posts.map(transformPartner);
  } catch (error) {
    console.error('Error fetching huvudpartners from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch partners in Affärsnatverket
 * Filters by med_i_osternatverket = true using GraphQL contentFilter
 */
export async function fetchPartnersInAffarsnatverket(): Promise<Partner[]> {
  try {
    const { posts } = await frontspace.partners.getAll({
      contentFilter: {
        med_i_osternatverket: true,
      },
      sort: 'title',
      limit: 150, // Reduced from 500 to prevent memory issues
    });

    return posts.map(transformPartner);
  } catch (error) {
    console.error('Error fetching partners in Affärsnatverket from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch partners in Öster i Samhället
 * Filters by partner_till_oster_i_samhallet = true using GraphQL contentFilter
 * Returns partners with kopplade_paket field for grouping
 * Uses two-call approach: fetch partners + fetch partnerpaket for relation lookup
 */
export async function fetchPartnersInOsterISamhallet(): Promise<(Partner & { kopplade_paket?: { id: string; title: string; slug: string } })[]> {
  try {
    // Fetch partners and partnerpaket in parallel
    const [partnersResult, partnerpaketResult] = await Promise.all([
      frontspace.partners.getAll({
        contentFilter: {
          partner_till_oster_i_samhallet: true,
        },
        limit: 150,
      }),
      fetchPosts('partnerpaket', { limit: 500 }),
    ]);

    const { posts: partners } = partnersResult;
    const { posts: allPartnerpaket } = partnerpaketResult;

    // Build lookup map for partnerpaket by ID
    const partnerpaketMap = new Map<string, { id: string; title: string; slug: string }>();
    for (const paket of allPartnerpaket as any[]) {
      partnerpaketMap.set(paket.id, {
        id: paket.id,
        title: paket.title,
        slug: paket.slug,
      });
    }

    return partners.map((partner: any) => {
      const transformed = transformPartner(partner);

      // Parse content to get kopplade_paket UUID
      let content = partner.content || {};
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch {
          content = {};
        }
      }

      // kopplade_paket is a UUID string - look up the full object
      const koppladePaketId = content.kopplade_paket;
      const koppladePaket = typeof koppladePaketId === 'string'
        ? partnerpaketMap.get(koppladePaketId)
        : undefined;

      return {
        ...transformed,
        kopplade_paket: koppladePaket,
      };
    });
  } catch (error) {
    console.error('Error fetching partners in Öster i Samhället from Frontspace:', error);
    return [];
  }
}

