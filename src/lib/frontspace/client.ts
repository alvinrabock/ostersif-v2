/**
 * Frontspace CMS GraphQL Client
 * Replaces Payload CMS with Frontspace headless CMS
 */

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

if (!FRONTSPACE_ENDPOINT) {
  console.warn('⚠️  Frontspace endpoint not configured. Set FRONTSPACE_ENDPOINT in .env');
}

if (!FRONTSPACE_STORE_ID) {
  console.warn('⚠️  Frontspace store ID not configured. Set FRONTSPACE_STORE_ID in .env');
}

/**
 * Base GraphQL fetch function for Frontspace API
 */
async function frontspaceGraphQLFetch<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  console.log(`🌐 Fetching from Frontspace GraphQL: ${FRONTSPACE_ENDPOINT}`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-store-id': FRONTSPACE_STORE_ID,
    };

    if (FRONTSPACE_API_KEY) {
      headers['Authorization'] = `Bearer ${FRONTSPACE_API_KEY}`;
    }

    const response = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

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
    console.error(`❌ Error fetching from Frontspace GraphQL:`, error);
    throw error;
  }
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
          target
          css_class
          parent_id
          sort_order
          is_active
          created_at
          page {
            id
            slug
            title
          }
          children {
            id
            title
            link_type
            url
            slug
            page_id
            target
            page {
              id
              slug
              title
            }
            children {
              id
              title
              link_type
              url
              slug
              page_id
              target
              page {
                id
                slug
                title
              }
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
    });

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
    });

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
    });
    return data.page;
  } catch (error) {
    console.error(`Error fetching page ${slug}:`, error);
    return null;
  }
}

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
    sort?: string;
  }
): Promise<{ posts: T[]; total: number }> {
  const { limit = 10, offset = 0, contentFilter } = options || {};

  // Construct GraphQL query for fetching posts from Frontspace
  const query = `
    query GetPosts($storeId: String!, $postTypeSlug: String, $limit: Int, $offset: Int, $contentFilter: JSON) {
      posts(storeId: $storeId, postTypeSlug: $postTypeSlug, limit: $limit, offset: $offset, contentFilter: $contentFilter) {
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
    const variables = {
      storeId: FRONTSPACE_STORE_ID,
      postTypeSlug: postType,
      limit,
      offset,
      contentFilter: contentFilter || null,
    };

    if (contentFilter) {
      console.log(`📊 Fetching ${postType} with contentFilter:`, JSON.stringify(contentFilter));
      console.log('Variables being sent:', JSON.stringify(variables, null, 2));
    }

    const data = await frontspaceGraphQLFetch<{ posts: T[] }>(query, variables);

    console.log(`📦 Received ${data.posts?.length || 0} ${postType} from API`);

    return {
      posts: data.posts || [],
      total: data.posts?.length || 0,
    };
  } catch (error) {
    console.error(`Error fetching ${postType}:`, error);
    return { posts: [], total: 0 };
  }
}

/**
 * Fetch a single post by slug
 */
export async function fetchPostBySlug<T>(
  postType: string,
  slug: string
): Promise<T | null> {
  const singularType = postType.replace(/s$/, ''); // Remove trailing 's' for singular

  const query = `
    query GetPost($slug: String!) {
      ${singularType}(slug: $slug) {
        id
        title
        slug
        status
        created_at
        updated_at
        published_at
      }
    }
  `;

  try {
    const data = await frontspaceGraphQLFetch<any>(query, { slug });
    return data[singularType] || null;
  } catch (error) {
    console.error(`Post not found: ${postType}/${slug}`);
    return null;
  }
}

/**
 * Fetch huvudmeny (main menu)
 */
export async function fetchHuvudmeny() {
  return await fetchMenuBySlug('huvudmeny');
}

// Export specific post type fetchers
export const frontspace = {
  pages: {
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
  },
  personal: {
    getAll: (options?: Parameters<typeof fetchPosts>[1]) =>
      fetchPosts('personal', options),
    getBySlug: (slug: string) =>
      fetchPostBySlug('personal', slug),
  },
};
