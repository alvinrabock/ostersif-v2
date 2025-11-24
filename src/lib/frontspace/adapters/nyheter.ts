/**
 * Nyheter (News) Adapter
 * Adapts Frontspace Nyhet type to match legacy Post type from Payload
 */

import { frontspace } from '../client';
import type { Nyhet } from '../types';
import type { Post } from '@/types';

/**
 * Transform Frontspace Nyhet to legacy Post format
 */
function transformNyhetToPost(nyhet: any): Post {
  // Handle the new Frontspace API structure
  const content = nyhet.content || {};
  const omslagsbild = content.omslagsbild;

  // Get Frontspace endpoint from env or use default
  const frontspaceEndpoint = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000';
  const baseUrl = frontspaceEndpoint.replace('/api/graphql', '');

  // Handle omslagsbild - it can be either a string URL or an object
  let heroImageUrl: string | undefined;
  if (typeof omslagsbild === 'string') {
    // It's a direct URL string
    heroImageUrl = omslagsbild;
  } else if (omslagsbild && typeof omslagsbild === 'object' && omslagsbild.url) {
    // It's an object with url property
    heroImageUrl = omslagsbild.url?.startsWith('http')
      ? omslagsbild.url
      : `${baseUrl}${omslagsbild.url}`;
  }

  return {
    id: nyhet.id,
    slug: nyhet.slug,
    title: nyhet.title,
    meta: {
      title: nyhet.title,
      description: content.ingress || '',
    },
    publishedAt: nyhet.published_at || nyhet.created_at,
    createdAt: nyhet.created_at,
    updatedAt: nyhet.updated_at,
    // Map hero image from omslagsbild
    heroImage: heroImageUrl ? {
      id: typeof omslagsbild === 'object' ? omslagsbild.id : nyhet.id,
      url: heroImageUrl,
      alt: (typeof omslagsbild === 'object' ? omslagsbild.alt : null) || nyhet.title,
      width: typeof omslagsbild === 'object' ? omslagsbild.width : null,
      height: typeof omslagsbild === 'object' ? omslagsbild.height : null,
      filename: typeof omslagsbild === 'object' ? omslagsbild.filename : null,
      mimeType: typeof omslagsbild === 'object' ? omslagsbild.mimeType : null,
      createdAt: nyhet.created_at,
      updatedAt: nyhet.updated_at,
      thumbnailURL: null,
      filesize: null,
      focalX: null,
      focalY: null,
    } : undefined,
    // Map YouTube link
    youtubeLink: content.youtube_link || null,
    // Map content
    layout: content.content ? [{
      blockType: 'content',
      columns: [{
        richText: content.content,
      }],
    }] : [],
    // Additional fields
    fastPost: content.fast_post || false,
    visaPaHemsida: content.visa_upp_pa_start || false,
  } as Post;
}

/**
 * Fetch all news posts with pagination
 */
export async function fetchAllNyheter(
  limit = 10,
  page = 1
): Promise<Post[]> {
  try {
    const offset = (page - 1) * limit;
    const { posts } = await frontspace.nyheter.getAll({
      limit,
      offset,
      sort: '-publishedAt',
    });

    return posts.map(transformNyhetToPost);
  } catch (error) {
    console.error('Error fetching nyheter from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch single news post by slug
 */
export async function fetchSingleNyhet(slug: string): Promise<Post | null> {
  try {
    const nyhet = await frontspace.nyheter.getBySlug(slug);
    if (!nyhet) return null;

    return transformNyhetToPost(nyhet);
  } catch (error) {
    console.error(`Error fetching nyhet ${slug} from Frontspace:`, error);
    return null;
  }
}

/**
 * Fetch news posts by category
 */
export async function fetchNyheterByCategory(
  categorySlug: string,
  limit = 10,
  page = 1
): Promise<Post[]> {
  try {
    const offset = (page - 1) * limit;
    const { posts } = await frontspace.nyheter.getAll({
      limit,
      offset,
      sort: '-publishedAt',
      filters: {
        'kategorier.slug': categorySlug,
      },
    });

    return posts.map(transformNyhetToPost);
  } catch (error) {
    console.error(`Error fetching nyheter by category ${categorySlug}:`, error);
    return [];
  }
}

/**
 * Fetch pinned/featured posts
 */
export async function fetchFastPosts(limit = 5): Promise<Post[]> {
  try {
    const { posts } = await frontspace.nyheter.getAll({
      limit,
      filters: {
        fastPost: true,
      },
      sort: '-publishedAt',
    });

    return posts.map(transformNyhetToPost);
  } catch (error) {
    console.error('Error fetching fast posts from Frontspace:', error);
    return [];
  }
}

/**
 * Fetch posts for homepage
 */
export async function fetchHomepageNyheter(limit = 5): Promise<Post[]> {
  try {
    const { posts } = await frontspace.nyheter.getAll({
      limit,
      filters: {
        visaPaHemsida: true,
      },
      sort: '-publishedAt',
    });

    return posts.map(transformNyhetToPost);
  } catch (error) {
    console.error('Error fetching homepage nyheter from Frontspace:', error);
    return [];
  }
}

/**
 * Search news posts
 */
export async function searchNyheter(
  searchTerm: string,
  limit = 10
): Promise<Post[]> {
  try {
    const { posts } = await frontspace.nyheter.getAll({
      limit,
      filters: {
        rubrik: { contains: searchTerm },
      },
      sort: '-publishedAt',
    });

    return posts.map(transformNyhetToPost);
  } catch (error) {
    console.error(`Error searching nyheter for "${searchTerm}":`, error);
    return [];
  }
}
