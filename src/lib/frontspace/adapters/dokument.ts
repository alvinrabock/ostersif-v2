/**
 * Dokument (Documents) Adapter
 * Fetches document data from Frontspace CMS
 */

import { frontspace } from '../client';

// Frontspace Dokument content type based on expected API response
export interface FrontspaceDokumentContent {
  beskrivning?: string;
  fil?: string; // URL to the file (resolved from media object)
  kategori?: string | string[] | any; // Category relation field (can be ID, array of IDs, or populated objects)
}

// Dokumentkategori type
export interface FrontspaceDokumentkategori {
  id: string;
  title: string;
  slug: string;
  content?: {
    beskrivning?: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string;
}

export interface FrontspaceDokument {
  id: string;
  title: string;
  slug: string;
  content: FrontspaceDokumentContent;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string;
}

/**
 * Extract the direct (non-proxied) URL from a Frontspace media URL.
 * The Frontspace proxy format is: https://api.frontspace.se/v1/image?url=<encoded>
 * or locally: http://localhost:3002/v1/image?url=<encoded>
 * For documents/files we always want the inner direct URL so users can download them.
 */
function resolveDirectUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === '/v1/image') {
      const inner = parsed.searchParams.get('url');
      if (inner) return decodeURIComponent(inner);
    }
  } catch {}
  return url;
}

/**
 * Extract file URL from Frontspace media field
 * The fil field can be:
 * - A string URL directly
 * - A media object with a url property
 * - An ID reference that needs to be resolved
 */
function extractFileUrl(fil: any): string | undefined {
  if (!fil) return undefined;

  // If it's already a string URL
  if (typeof fil === 'string') {
    if (fil.startsWith('http')) {
      return resolveDirectUrl(fil);
    }
    // If it looks like a UUID, we can't resolve it here
    if (fil.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const baseUrl = (process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000').replace('/api/graphql', '');
      return `${baseUrl}/api/media/${fil}`;
    }
    return fil;
  }

  // If it's a media object with url property
  if (typeof fil === 'object' && fil.url) {
    const url = fil.url;
    if (url.startsWith('http')) {
      return resolveDirectUrl(url);
    }
    const baseUrl = (process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000').replace('/api/graphql', '');
    return `${baseUrl}${url}`;
  }

  return undefined;
}

/**
 * Transform raw Frontspace response to FrontspaceDokument type
 */
function transformDokument(doc: any): FrontspaceDokument {
  const content = doc.content || {};

  // Resolve the file URL from the fil or dokument field (API may use either)
  const fileUrl = extractFileUrl(content.fil) || extractFileUrl(content.dokument);

  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    content: {
      ...content,
      fil: fileUrl,
    },
    status: doc.status,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    published_at: doc.published_at,
  };
}

/**
 * Fetch all documents
 */
export async function fetchAllDokument(limit = 100): Promise<FrontspaceDokument[]> {
  try {
    const { posts } = await frontspace.dokument.getAll({
      limit,
      sortBy: 'sort_order',
      sortDirection: 'asc',
    });
    return posts.map(transformDokument);
  } catch (error) {
    console.error('Error fetching dokument from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch single document by slug
 */
export async function fetchSingleDokument(slug: string): Promise<FrontspaceDokument | null> {
  try {
    const doc = await frontspace.dokument.getBySlug(slug);
    if (!doc) return null;

    return transformDokument(doc);
  } catch (error) {
    console.error(`Error fetching dokument ${slug} from Frontspace:`, error);
    return null;
  }
}

/**
 * Fetch all document categories
 */
export async function fetchAllDokumentkategorier(limit = 100): Promise<FrontspaceDokumentkategori[]> {
  try {
    const { posts } = await frontspace.dokumentkategorier.getAll({
      limit,
      sortBy: 'sort_order',
      sortDirection: 'asc',
    });
    console.log('[fetchAllDokumentkategorier] Categories with sort_order:', posts.map((p: any) => ({
      title: p.title,
      sort_order: p.sort_order,
    })));
    return posts as FrontspaceDokumentkategori[];
  } catch (error) {
    console.error('Error fetching dokumentkategorier from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch documents by category
 * Uses where clause with contains operator for array relation fields
 */
export async function fetchDokumentByCategory(
  categorySlug: string,
  limit = 100,
  page = 1
): Promise<FrontspaceDokument[]> {
  try {
    // Step 1: Get the category UUID from the slug
    const category = await frontspace.dokumentkategorier.getBySlug(categorySlug) as any;

    if (!category || !category.id) {
      console.warn(`[fetchDokumentByCategory] Category not found: ${categorySlug}`);
      return [];
    }

    // Step 2: Fetch documents filtered by category UUID using where clause
    const offset = (page - 1) * limit;

    const { posts } = await frontspace.dokument.getAll({
      limit,
      offset,
      sortBy: 'sort_order',
      sortDirection: 'asc',
      where: {
        content: {
          kategori: { contains: category.id },
        },
      },
    });

    return posts.map(transformDokument);
  } catch (error) {
    console.error(`Error fetching dokument by category ${categorySlug}:`, error);
    return [];
  }
}
