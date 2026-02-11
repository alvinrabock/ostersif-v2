/**
 * Frontspace CMS GraphQL Client
 * Replaces Payload CMS with Frontspace headless CMS
 */

import { unstable_cache } from 'next/cache';

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

// Request timeout for GraphQL requests (15 seconds - allows for slow API responses)
const REQUEST_TIMEOUT_MS = 15000;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

if (!FRONTSPACE_ENDPOINT) {
  console.warn('⚠️  Frontspace endpoint not configured. Set FRONTSPACE_ENDPOINT in .env');
}

if (!FRONTSPACE_STORE_ID) {
  console.warn('⚠️  Frontspace store ID not configured. Set FRONTSPACE_STORE_ID in .env');
}

/**
 * Cache tag constants for consistent revalidation
 * These MUST match the tags used in the webhook handler
 */
export const CACHE_TAGS = {
  FRONTSPACE: 'frontspace',
  NYHETER: 'nyheter',
  LAG: 'lag',
  PARTNERS: 'partners',
  PERSONAL: 'personal',
  JOBB: 'jobb',
  DOKUMENT: 'dokument',
  NYHETSKATEGORIER: 'nyhetskategorier',
  PAGES: 'pages',
  MENUS: 'menus',
  FOOTER: 'footer',
  SPELARE: 'spelare',
  STAB: 'stab',
  FORMS: 'forms',
  MATCHER: 'matcher',
} as const;

/**
 * Get cache tags for a post type
 * Returns array of tags including the specific post type, general frontspace tag, and store-specific tag
 */
function getPostTypeCacheTags(postType: string): string[] {
  const normalizedType = postType.toLowerCase();
  const storeTag = `frontspace-${FRONTSPACE_STORE_ID}`;
  return [normalizedType, CACHE_TAGS.FRONTSPACE, storeTag];
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (rate limit or server error)
 */
function isRetryableError(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Base GraphQL fetch function for Frontspace API with retry logic
 */
async function frontspaceGraphQLFetch<T>(
  query: string,
  variables?: Record<string, any>,
  tags?: string[]
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-store-id': FRONTSPACE_STORE_ID,
      };

      if (FRONTSPACE_API_KEY) {
        headers['Authorization'] = `Bearer ${FRONTSPACE_API_KEY}`;
      }

      // Debug: Log if store ID is missing
      if (!FRONTSPACE_STORE_ID) {
        console.error('❌ FRONTSPACE_STORE_ID is empty! Check .env file');
      }

      const response = await fetch(FRONTSPACE_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
        signal: controller.signal,
        next: {
          tags: tags || ['frontspace'], // Cache indefinitely, revalidate only via webhook
        },
      });

      clearTimeout(timeoutId);

      // Handle rate limit (429) and server errors (5xx) with retry
      if (isRetryableError(response.status)) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff

        console.warn(`⚠️ Frontspace API returned ${response.status}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);

        if (attempt < MAX_RETRIES - 1) {
          await sleep(delayMs);
          continue;
        }
      }

      const result = await response.json();

      if (!response.ok) {
        console.error('GraphQL Response Error:', result);
        throw new Error(`Frontspace GraphQL error: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
      }

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`⏱️ Timeout on attempt ${attempt + 1}/${MAX_RETRIES}`);
        lastError = new Error(`Frontspace GraphQL timeout after ${REQUEST_TIMEOUT_MS}ms`);

        // Retry on timeout
        if (attempt < MAX_RETRIES - 1) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delayMs);
          continue;
        }
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Don't retry on non-retryable errors
        break;
      }
    }
  }

  console.error(`❌ Frontspace GraphQL failed after ${MAX_RETRIES} attempts:`, lastError);
  throw lastError || new Error('Frontspace GraphQL request failed');
}

/**
 * Fetch menu by slug
 */
export async function fetchMenuBySlug(slug: string): Promise<any> {
  const query = `
    query GetMenuBySlug($storeId: String!, $slug: String!) {
      menuBySlug(storeId: $storeId, slug: $slug) {
        id
        name
        slug
        store_id
        created_at
        updated_at
        items {
          id
          menu_id
          title
          link_type
          url
          slug
          page_id
          full_path
          target
          css_class
          parent_id
          sort_order
          is_active
          created_at
          children {
            id
            title
            link_type
            url
            slug
            page_id
            full_path
            target
            children {
              id
              title
              link_type
              url
              slug
              page_id
              full_path
              target
            }
          }
        }
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<{ menuBySlug: any }>(query, {
      storeId: FRONTSPACE_STORE_ID,
      slug,
    }, [CACHE_TAGS.MENUS, CACHE_TAGS.FRONTSPACE, `frontspace-${FRONTSPACE_STORE_ID}`]);

    if (!data.menuBySlug) {
      console.warn(`Menu with slug "${slug}" not found for store ${FRONTSPACE_STORE_ID}`);
      return null;
    }

    return data.menuBySlug;
  } catch (error) {
    console.error(`Error fetching menu "${slug}":`, error);
    return null;
  }
}

/**
 * Fetch footer template
 */
export async function fetchFooter(): Promise<any> {
  const query = `
    query GetFooter($storeId: String!) {
      footer(storeId: $storeId) {
        id
        name
        content {
          blocks {
            id
            type
            content
            styles
            responsiveStyles
          }
        }
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<{ footer: any }>(query, {
      storeId: FRONTSPACE_STORE_ID,
    }, [CACHE_TAGS.FOOTER, CACHE_TAGS.FRONTSPACE, `frontspace-${FRONTSPACE_STORE_ID}`]);

    // Handle null or empty blocks gracefully
    if (data.footer && data.footer.content) {
      if (!data.footer.content.blocks) {
        data.footer.content.blocks = [];
      }
    }

    return data.footer;
  } catch (error) {
    console.error('Error fetching footer:', error);
    return null;
  }
}

/**
 * Fetch page by slug
 */
export async function fetchPageBySlug(slug: string): Promise<any> {
  const query = `
    query GetPage($storeId: String!, $slug: String!) {
      page(storeId: $storeId, slug: $slug) {
        id
        title
        slug
        parent_id
        status
        created_at
        updated_at
        published_at
        content {
          blocks {
            id
            type
            content
            styles
            responsiveStyles
          }
          pageSettings {
            seoTitle
            seoDescription
            ogImage
          }
        }
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<{ page: any }>(query, {
      storeId: FRONTSPACE_STORE_ID,
      slug,
    }, [CACHE_TAGS.PAGES, CACHE_TAGS.FRONTSPACE, `frontspace-${FRONTSPACE_STORE_ID}`]);
    return data.page;
  } catch (error) {
    console.error(`Error fetching page ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all pages (for routing)
 */
export async function fetchAllPages(options?: {
  limit?: number;
}): Promise<any[]> {
  const { limit = 200 } = options || {}; // Reduced from 1000 to prevent memory issues

  const query = `
    query GetAllPages($storeId: String!, $limit: Int) {
      pages(storeId: $storeId, limit: $limit) {
        id
        title
        slug
        parent_id
        status
        created_at
        updated_at
        published_at
        content {
          blocks {
            id
            type
            content
            styles
            responsiveStyles
          }
          pageSettings {
            seoTitle
            seoDescription
            ogImage
          }
        }
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<{ pages: any[] }>(query, {
      storeId: FRONTSPACE_STORE_ID,
      limit,
    }, [CACHE_TAGS.PAGES, CACHE_TAGS.FRONTSPACE, `frontspace-${FRONTSPACE_STORE_ID}`]);
    // Filter to only published pages on the client side
    const publishedPages = (data.pages || []).filter((page: any) => page.status === 'published');
    return publishedPages;
  } catch (error) {
    console.error('Error fetching all pages:', error);
    return [];
  }
}

/**
 * Where clause operators for server-side filtering
 * Frontspace supports: equals, not_equals, greater_than, less_than,
 * greater_than_equal, less_than_equal, like, contains, in, not_in
 */
export interface WhereOperators {
  equals?: any;
  not_equals?: any;
  greater_than?: any;
  less_than?: any;
  greater_than_equal?: any;
  less_than_equal?: any;
  like?: string;
  contains?: string;
  in?: any[];
  not_in?: any[];
}

export type WhereClause = {
  [field: string]: WhereOperators | any;
} & {
  AND?: WhereClause[];
  OR?: WhereClause[];
};

/**
 * Fetch all posts of a specific type
 */
export async function fetchPosts<T>(
  postType: string,
  options?: {
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
    contentFilter?: Record<string, any>;
    where?: WhereClause;
    sort?: string;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }
): Promise<{ posts: T[]; total: number; hasMore?: boolean }> {
  const { limit = 10, offset = 0, filters, contentFilter, where, search, sort, sortBy, sortDirection } = options || {};

  // Use filters as contentFilter if provided (filters is the public API, contentFilter is the internal GraphQL param)
  // The where clause takes precedence over contentFilter for advanced filtering
  const actualContentFilter = where || contentFilter || filters || null;

  // Convert legacy sort format (e.g., '-publishedAt') to sortBy/sortDirection
  let actualSortBy = sortBy;
  let actualSortDirection = sortDirection;
  if (sort && !sortBy) {
    if (sort.startsWith('-')) {
      actualSortBy = sort.slice(1) === 'publishedAt' ? 'published_at' : sort.slice(1);
      actualSortDirection = 'desc';
    } else {
      actualSortBy = sort === 'publishedAt' ? 'published_at' : sort;
      actualSortDirection = 'asc';
    }
  }

  // Construct GraphQL query for fetching posts from Frontspace with search and where clause support
  // Note: Relation fields like kategori are stored in the content JSON, not as separate fields
  // The 'where' clause supports operators like: equals, greater_than, less_than, contains, in, etc.
  // Example: { "content.datum": { "greater_than": "2025-01-01" } }
  const query = `
    query GetPosts($storeId: String!, $postTypeSlug: String, $limit: Int, $offset: Int, $where: PostWhere, $search: String, $sortBy: String, $sortDirection: String) {
      posts(storeId: $storeId, postTypeSlug: $postTypeSlug, limit: $limit, offset: $offset, where: $where, search: $search, sortBy: $sortBy, sortDirection: $sortDirection) {
        posts {
          id
          title
          slug
          content
          status
          sort_order
          created_at
          updated_at
          published_at
          postType {
            id
            name
            slug
          }
        }
        totalCount
        hasMore
      }
    }
  `;

  try {
    const variables: Record<string, any> = {
      storeId: FRONTSPACE_STORE_ID,
      postTypeSlug: postType,
      limit,
      offset,
      where: actualContentFilter,
    };

    // Only add search params if we're searching
    if (search) {
      variables.search = search;
    }
    if (actualSortBy) {
      variables.sortBy = actualSortBy;
    }
    if (actualSortDirection) {
      variables.sortDirection = actualSortDirection;
    }

    const data = await frontspaceGraphQLFetch<{ posts: { posts: any[]; totalCount: number; hasMore: boolean } }>(
      query,
      variables,
      getPostTypeCacheTags(postType)
    );

    // API returns PostsResult object
    if (data.posts && Array.isArray(data.posts.posts)) {
      const publishedPosts = data.posts.posts.filter((post: any) => post.status === 'published');
      return {
        posts: publishedPosts as T[],
        total: data.posts.totalCount || publishedPosts.length,
        hasMore: data.posts.hasMore,
      };
    }

    // If posts is null or empty, return empty result
    return { posts: [], total: 0 };
  } catch (error) {
    console.error(`Error fetching ${postType}:`, error);
    return { posts: [], total: 0 };
  }
}

/**
 * Fetch a single post by slug
 * Uses the generic 'post' query with postTypeSlug parameter
 * Note: Relation fields like kategori are stored in the content JSON, not as separate fields
 */
export async function fetchPostBySlug<T>(
  postType: string,
  slug: string
): Promise<T | null> {
  const query = `
    query GetPost($storeId: String!, $postTypeSlug: String!, $slug: String!) {
      post(storeId: $storeId, postTypeSlug: $postTypeSlug, slug: $slug) {
        id
        title
        slug
        content
        status
        created_at
        updated_at
        published_at
        postType {
          id
          name
          slug
        }
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<any>(query, {
      storeId: FRONTSPACE_STORE_ID,
      postTypeSlug: postType,
      slug
    }, getPostTypeCacheTags(postType));

    // Only return published posts
    if (data.post && data.post.status !== 'published') {
      return null;
    }

    return data.post || null;
  } catch (_error) {
    console.error(`Post not found: ${postType}/${slug}`);
    return null;
  }
}

/**
 * Fetch a single post by its CMS ID (UUID/ULID)
 * Uses the postById query if available, falls back to posts query with ID filter
 */
export async function fetchPostById<T>(
  postType: string,
  id: string
): Promise<T | null> {
  // Try fetching by ID using the posts query with ID in where clause
  const query = `
    query GetPostById($storeId: String!, $postTypeSlug: String!, $id: String!) {
      postById(storeId: $storeId, postTypeSlug: $postTypeSlug, id: $id) {
        id
        title
        slug
        content
        status
        created_at
        updated_at
        published_at
        postType {
          id
          name
          slug
        }
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<any>(query, {
      storeId: FRONTSPACE_STORE_ID,
      postTypeSlug: postType,
      id
    }, getPostTypeCacheTags(postType));

    if (data.postById && data.postById.status === 'published') {
      return data.postById as T;
    }
  } catch {
    // postById query might not exist, try alternative approach
  }

  // Fallback: Try using the slug query (in case ID is also a valid slug)
  try {
    return await fetchPostBySlug<T>(postType, id);
  } catch {
    // Slug lookup failed
  }

  return null;
}

/**
 * Fetch huvudmeny (main menu)
 * Menu items now include full_path from the backend, no need to fetch all pages
 */
export async function fetchHuvudmeny() {
  const menu = await fetchMenuBySlug('huvudmeny');

  if (!menu || !menu.items) return menu;

  // Transform menu items to use full_path as url for internal links
  menu.items = transformMenuItemsWithFullPath(menu.items);

  return menu;
}

/**
 * Transform menu items to use full_path for internal page links
 */
function transformMenuItemsWithFullPath(items: any[]): any[] {
  return items.map(item => {
    const transformed = { ...item };

    // Use full_path for internal links
    if (item.link_type === 'internal' && item.full_path) {
      transformed.url = item.full_path;
    }

    // Recursively transform children
    if (item.children && item.children.length > 0) {
      transformed.children = transformMenuItemsWithFullPath(item.children);
    }

    return transformed;
  });
}

/**
 * Fetch partners with expanded relation fields (partnerniva)
 */
async function fetchPartnersWithRelations(
  options?: {
    limit?: number;
    offset?: number;
    contentFilter?: Record<string, any>;
  }
): Promise<{ posts: any[]; total: number }> {
  const { limit = 100, offset = 0, contentFilter } = options || {};

  // Query format with PostsResult
  // Note: Relation fields like partnerniva are stored in the content JSON, not as separate fields
  const query = `
    query GetPartnersWithRelations($storeId: String!, $limit: Int, $offset: Int, $contentFilter: JSON) {
      posts(storeId: $storeId, postTypeSlug: "partners", limit: $limit, offset: $offset, contentFilter: $contentFilter) {
        posts {
          id
          title
          slug
          content
          status
          sort_order
          created_at
          updated_at
          published_at
          postType {
            id
            name
            slug
          }
        }
        totalCount
        hasMore
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<{ posts: { posts: any[]; totalCount: number } }>(query, {
      storeId: FRONTSPACE_STORE_ID,
      limit,
      offset,
      contentFilter,
    }, getPostTypeCacheTags('partners'));

    if (data.posts && Array.isArray(data.posts.posts)) {
      return {
        posts: data.posts.posts || [],
        total: data.posts.totalCount || data.posts.posts.length,
      };
    }

    // If posts is null or empty, return empty result
    return { posts: [], total: 0 };
  } catch (error) {
    console.error('Error fetching partners with relations:', error);
    return { posts: [], total: 0 };
  }
}

// Export specific post type fetchers
export const frontspace = {
  pages: {
    getAll: (options?: Parameters<typeof fetchAllPages>[0]) => fetchAllPages(options),
    getBySlug: (slug: string) => fetchPageBySlug(slug),
  },
  menus: {
    getBySlug: (slug: string) => fetchMenuBySlug(slug),
    getHuvudmeny: () => fetchHuvudmeny(),
  },
  nyheter: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('nyheter', { ...options, sort: options?.sort || '-publishedAt' }),
    getBySlug: (slug: string) =>
      fetchPostBySlug('nyheter', slug),
    search: (searchTerm: string, limit = 10) =>
      fetchPosts('nyheter', { search: searchTerm, limit, sortBy: 'published_at', sortDirection: 'desc' }),
  },
  lag: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('lag', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('lag', slug),
  },
  partners: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('partners', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('partners', slug),
    getAllWithRelations: (options?: { limit?: number; offset?: number; contentFilter?: Record<string, any> }) =>
      fetchPartnersWithRelations(options),
  },
  personal: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('personal', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('personal', slug),
  },
  nyhetskategorier: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('nyhetskategorier', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('nyhetskategorier', slug),
  },
  dokument: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('dokument', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('dokument', slug),
  },
  jobb: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('jobb', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('jobb', slug),
  },
  spelare: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('spelare', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('spelare', slug),
  },
  stab: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('stab', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('stab', slug),
  },
  forms: {
    getById: (formId: string) => fetchFormById(formId),
  },
  matcher: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('matcher', { ...options, sortBy: 'content.datum', sortDirection: 'asc' }),
    getBySlug: (slug: string) =>
      fetchPostBySlug('matcher', slug),
    getById: (id: string) =>
      fetchPostById('matcher', id),
    /**
     * Get upcoming matches using server-side filtering
     * Filters: datum >= today (status filtered client-side for OR logic)
     */
    getUpcoming: (limit = 10) => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      return fetchPosts('matcher', {
        limit,
        where: {
          content: {
            datum: { greater_than_equal: today },
          },
        },
        sortBy: 'content.datum',
        sortDirection: 'asc',
      });
    },
    /**
     * Get past matches using server-side filtering
     * Filters: match_status = 'Over'
     */
    getPast: (limit = 10) => {
      return fetchPosts('matcher', {
        limit,
        where: {
          content: {
            match_status: { equals: 'Over' },
          },
        },
        sortBy: 'content.datum',
        sortDirection: 'desc',
      });
    },
    /**
     * Get matches within a date range using server-side filtering
     */
    getByDateRange: (startDate: string, endDate: string, limit = 100) => {
      return fetchPosts('matcher', {
        limit,
        where: {
          content: {
            datum: { greater_than_equal: startDate, less_than_equal: endDate },
          },
        },
        sortBy: 'content.datum',
        sortDirection: 'asc',
      });
    },
    /**
     * Get matches by season using server-side filtering
     */
    getBySeason: (season: string, limit = 100) => {
      return fetchPosts('matcher', {
        limit,
        where: {
          content: {
            sasong: { equals: season },
          },
        },
        sortBy: 'content.datum',
        sortDirection: 'asc',
      });
    },
    /**
     * Get matches by status using server-side filtering
     */
    getByStatus: (status: 'Scheduled' | 'In progress' | 'Over', limit = 100) => {
      return fetchPosts('matcher', {
        limit,
        where: {
          content: {
            match_status: { equals: status },
          },
        },
        sortBy: 'content.datum',
        sortDirection: status === 'Over' ? 'desc' : 'asc',
      });
    },
    getByExternalId: async (externalMatchId: string) => {
      const result = await fetchPosts('matcher', {
        limit: 1,
        where: {
          content: {
            externalmatchid: { equals: externalMatchId },
          },
        },
      });
      return result.posts[0] || null;
    },
  },
};

// ============================================================================
// FORMS
// ============================================================================

export interface FormField {
  name: string
  label: string
  type: string // 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio'
  required: boolean
  placeholder?: string
  options?: string[] // For select, radio, checkbox fields
}

export interface Form {
  id: string
  name: string
  status: string // 'active' | 'inactive'
  fields: FormField[]
  email_settings?: {
    send_to_type?: string
    to_email?: string
    form_email_field?: string
    subject?: string
    send_confirmation_to_user?: boolean
    confirmation_subject?: string
    confirmation_message?: string
  }
  created_at?: string
  updated_at?: string
}

/**
 * Fetch a specific form by ID
 */
export async function fetchFormById(formId: string): Promise<Form | null> {
  const query = `
    query GetForm($storeId: String!, $id: String!) {
      form(storeId: $storeId, id: $id) {
        id
        name
        status
        fields {
          name
          label
          type
          required
          placeholder
          options
        }
        email_settings {
          send_to_type
          to_email
          form_email_field
          subject
          send_confirmation_to_user
          confirmation_subject
          confirmation_message
        }
        created_at
        updated_at
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<{ form: Form }>(query, {
      storeId: FRONTSPACE_STORE_ID,
      id: formId,
    }, [CACHE_TAGS.FORMS, CACHE_TAGS.FRONTSPACE, `frontspace-${FRONTSPACE_STORE_ID}`]);

    return data.form || null;
  } catch (error) {
    console.error('Error fetching form:', error);
    return null;
  }
}

// ============================================================================
// CACHED WRAPPERS - On-demand revalidation only (no time-based polling)
// These are invalidated by webhook calling revalidateTag()
// ============================================================================

/**
 * Cached version of fetchFooter
 * Invalidated by webhook via 'footer' and 'frontspace' tags
 */
export const fetchFooterCached = unstable_cache(
  fetchFooter,
  ['footer-data'],
  { tags: [CACHE_TAGS.FOOTER, CACHE_TAGS.FRONTSPACE] }
);

/**
 * Cached version of fetchHuvudmeny
 * Invalidated by webhook via 'menus' and 'frontspace' tags
 * Note: No longer depends on PAGES since full_path is now provided by backend
 */
export const fetchHuvudmenyCached = unstable_cache(
  fetchHuvudmeny,
  ['huvudmeny-data'],
  { tags: [CACHE_TAGS.MENUS, CACHE_TAGS.FRONTSPACE] }
);

/**
 * Cached version of fetchAllPages
 * Invalidated by webhook via 'pages' and 'frontspace' tags
 */
export const fetchAllPagesCached = unstable_cache(
  async (options?: { limit?: number }) => {
    return await fetchAllPages(options);
  },
  ['all-pages-data'],
  { tags: [CACHE_TAGS.PAGES, CACHE_TAGS.FRONTSPACE] }
);

// ============================================================================
// MATCHER (MATCHES) - CMS-First with Fetch Cache
// Uses Next.js fetch cache with tag-based revalidation (same as nyheter)
// ============================================================================

import type { MatcherPost } from './types';

/**
 * Fetch all matches from CMS with optional where clause filtering
 * Uses Next.js fetch cache, invalidated by webhook via 'matcher' tag
 */
export async function fetchMatcherCached(options?: { limit?: number; where?: WhereClause }) {
  return await fetchPosts<MatcherPost>('matcher', {
    ...options,
    sortBy: 'datum',
    sortDirection: 'asc',
  });
}

/**
 * Fetch upcoming matches from CMS using server-side date filtering
 * Filters: datum >= today AND match_status NOT 'over'
 * Uses Next.js fetch cache, invalidated by webhook via 'matcher' tag
 */
export async function fetchUpcomingMatchesCached(limit = 10) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return await fetchPosts<MatcherPost>('matcher', {
    limit,
    where: {
      content: {
        datum: { greater_than_equal: today },
        match_status: { not_equals: 'over' },
      },
    },
    sortBy: 'content.datum',
    sortDirection: 'asc',
  });
}

/**
 * Fetch recent/past matches from CMS using server-side filtering
 * Filters: match_status = 'Over'
 * Uses Next.js fetch cache, invalidated by webhook via 'matcher' tag
 */
export async function fetchRecentMatchesCached(limit = 10) {
  return await fetchPosts<MatcherPost>('matcher', {
    limit,
    where: {
      content: {
        match_status: { equals: 'over' },
      },
    },
    sortBy: 'content.datum',
    sortDirection: 'desc',
  });
}

/**
 * Fetch matches by date range from CMS using server-side filtering
 * Uses Next.js fetch cache, invalidated by webhook via 'matcher' tag
 */
export async function fetchMatchesByDateRangeCached(startDate: string, endDate: string, limit = 100) {
  return await fetchPosts<MatcherPost>('matcher', {
    limit,
    where: {
      content: {
        datum: { greater_than_equal: startDate, less_than_equal: endDate },
      },
    },
    sortBy: 'datum',
    sortDirection: 'asc',
  });
}

/**
 * Fetch matches by season from CMS using server-side filtering
 * Uses Next.js fetch cache, invalidated by webhook via 'matcher' tag
 */
export async function fetchMatchesBySeasonCached(season: string, limit = 100) {
  return await fetchPosts<MatcherPost>('matcher', {
    limit,
    where: {
      content: {
        sasong: { equals: season },
      },
    },
    sortBy: 'datum',
    sortDirection: 'asc',
  });
}
