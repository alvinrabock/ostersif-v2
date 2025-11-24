'use server';

import { fetchPageData } from '@/lib/apollo/fetchSinglePage/action';
import { unstable_cache } from 'next/cache';

/**
 * Returns a cached function to fetch a single page document using GraphQL.
 */
export const getCachedDocument = async (slug: string) =>
  await unstable_cache(async () => await fetchPageData(slug), [`page_${slug}`], {
    tags: [`page_${slug}`],
  })();
