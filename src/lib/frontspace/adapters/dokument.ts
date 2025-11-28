/**
 * Dokument (Documents) Adapter
 * Fetches document data from Frontspace CMS
 */

import { frontspace } from '../client';

// Frontspace Dokument content type based on expected API response
export interface FrontspaceDokumentContent {
  beskrivning?: string;
  fil?: string; // URL to the file (resolved from media object)
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
    // Check if it's a full URL or just a path
    if (fil.startsWith('http')) {
      return fil;
    }
    // Could be an ID or a relative path
    // If it looks like a UUID, we can't resolve it here
    if (fil.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // It's likely an ID reference - construct URL from Frontspace endpoint
      const baseUrl = (process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000').replace('/api/graphql', '');
      return `${baseUrl}/api/media/${fil}`;
    }
    return fil;
  }

  // If it's a media object with url property
  if (typeof fil === 'object' && fil.url) {
    const url = fil.url;
    if (url.startsWith('http')) {
      return url;
    }
    // Relative URL - prepend base URL
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

  // Resolve the file URL from the fil field
  const fileUrl = extractFileUrl(content.fil);

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
    const { posts } = await frontspace.dokument.getAll({ limit });
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
