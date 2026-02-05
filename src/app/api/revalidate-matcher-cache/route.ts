/**
 * API endpoint to manually revalidate matcher cache
 * Used when cache is stale but no sync is needed
 */

import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { CACHE_TAGS } from '@/lib/frontspace/client';

export async function POST() {
  try {
    console.log('🔄 Manually revalidating matcher cache...');

    // Revalidate tags (for unstable_cache and fetch cache)
    revalidateTag(CACHE_TAGS.MATCHER);
    revalidateTag(CACHE_TAGS.FRONTSPACE);

    // Revalidate paths (for Full Route Cache)
    revalidatePath('/matcher');
    revalidatePath('/');

    console.log('✅ Cache revalidated (tags + paths)');

    return NextResponse.json({
      success: true,
      message: 'Cache revalidated successfully',
      revalidatedTags: [CACHE_TAGS.MATCHER, CACHE_TAGS.FRONTSPACE],
      revalidatedPaths: ['/matcher', '/'],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Cache revalidation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to revalidate matcher cache',
    tags: [CACHE_TAGS.MATCHER, CACHE_TAGS.FRONTSPACE],
  });
}
