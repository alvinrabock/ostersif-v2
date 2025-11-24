'use server';

import { fetchRedirects } from '@/lib/apollo/getRedirect/action';
import { unstable_cache } from 'next/cache';

/**
 * Returns a cached function to fetch all redirects using GraphQL.
 * This replaces the old getPayload function.
 */
export const getCachedRedirects = unstable_cache(fetchRedirects, ['redirects'], {
  tags: ['redirects'],
});
