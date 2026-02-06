/**
 * Frontspace Webhook Handler
 * Handles content updates from Frontspace CMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

const WEBHOOK_SECRET = process.env.FRONTSPACE_WEBHOOK_SECRET;

// Map known post_type_id UUIDs to their slugs
// These are the Frontspace post type IDs for this store
const POST_TYPE_ID_MAP: Record<string, string> = {
  '1d062e33-6965-4084-b3f2-981cb57e9790': 'nyheter',
  '5e8b21d9-5c7a-4919-8dc2-0ccde6108964': 'matcher',
  // Add other post type IDs as needed
};

/**
 * Verify webhook signature using HMAC
 */
async function verifyWebhookSignature(request: NextRequest, payload: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn('⚠️  FRONTSPACE_WEBHOOK_SECRET not configured');
    return false;
  }

  const receivedSignature = request.headers.get('x-webhook-signature') ||
                           request.headers.get('x-frontspace-signature');

  // Debug logging
  console.log('[Webhook] Signature check:', {
    hasSecret: !!WEBHOOK_SECRET,
    secretLength: WEBHOOK_SECRET?.length,
    receivedSignature: receivedSignature?.substring(0, 20) + '...',
    headers: Object.fromEntries(request.headers.entries()),
  });

  if (!receivedSignature) {
    console.warn('[Webhook] No signature header found');
    return false;
  }

  // Generate HMAC signature using the secret and payload
  const { createHmac } = await import('crypto');
  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const isValid = receivedSignature === expectedSignature;
  if (!isValid) {
    console.warn('[Webhook] Signature mismatch:', {
      received: receivedSignature?.substring(0, 20) + '...',
      expected: expectedSignature?.substring(0, 20) + '...',
    });
  }

  return isValid;
}

/**
 * Handle POST requests from Frontspace webhooks
 */
export async function POST(request: NextRequest) {
  console.log('[Webhook] POST request received');
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature (skip in development if secret not configured)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const skipVerification = isDevelopment && !WEBHOOK_SECRET;

    if (!skipVerification && !(await verifyWebhookSignature(request, rawBody))) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the payload
    const payload = JSON.parse(rawBody);

    // Log full payload for debugging (remove in production once working)
    console.log('[Webhook] Full payload:', JSON.stringify(payload, null, 2));

    // Frontspace sends data in nested structure: { event, data: { slug, post_type_id, ... } }
    const data = payload.data || payload;
    const slug = data.slug || payload.slug;

    // Try to get postType from various sources
    // postType can be an object like { id, name, slug } or a string
    const postTypeData = payload.postType || data.postType;
    let rawPostType: string | undefined;

    if (postTypeData && typeof postTypeData === 'object') {
      // Extract slug from postType object (preferred) or name as fallback
      rawPostType = postTypeData.slug || postTypeData.name;
    } else if (typeof postTypeData === 'string') {
      rawPostType = postTypeData;
    }

    // If no direct postType, try to get from post_type_id map
    if (!rawPostType && data.post_type_id) {
      // First try the UUID map
      rawPostType = POST_TYPE_ID_MAP[data.post_type_id];

      // If not in map, try to infer from content structure
      if (!rawPostType) {
        const content = typeof data.content === 'string' ? JSON.parse(data.content || '{}') : (data.content || {});

        if (content.kategori || content.kopplade_lag) {
          rawPostType = 'nyheter';
        } else if (content.partnerniva) {
          rawPostType = 'partners';
        } else if (content.avdelning) {
          rawPostType = 'personal';
        } else if (content.hemmalag || content.bortalag || content.datum) {
          rawPostType = 'matcher';
        }
      }
    }

    // Normalize postType to lowercase for consistent matching
    const postType = rawPostType?.toLowerCase() || 'unknown';

    // Get store ID from payload or environment
    const storeId = payload.store_id || data.store_id || process.env.FRONTSPACE_STORE_ID || '';

    const event = payload.event || '';
    console.log(`🔔 Webhook received: event="${event}", postType="${postType}", slug="${slug}", storeId="${storeId}"`);

    // For publish/delete events, wait for the database transaction to commit
    // Updates are immediate, but create/delete may have a slight delay
    // Note: revalidateTag() is fire-and-forget, so this delay helps ensure
    // the fresh data is available when cache is regenerated
    if (event === 'post.published' || event === 'post.deleted' || event === 'post.created') {
      console.log(`⏳ Waiting 3s for database transaction to commit...`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Debug: Verify the change is visible in Frontspace API (bypass cache)
      try {
        const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
        const debugResponse = await fetch(FRONTSPACE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.FRONTSPACE_API_KEY || '',
          },
          body: JSON.stringify({
            query: `query { posts(storeId: "${storeId}", postTypeSlug: "nyheter", limit: 5) { posts { id slug title status } totalCount } }`,
          }),
          cache: 'no-store', // Bypass cache for debug
        });
        const debugData = await debugResponse.json();
        console.log(`🔍 DEBUG: Fresh API data (no cache):`, JSON.stringify({
          totalCount: debugData.data?.posts?.totalCount,
          firstPosts: debugData.data?.posts?.posts?.slice(0, 3).map((p: any) => ({ slug: p.slug, status: p.status })),
        }));
      } catch (debugError) {
        console.log(`🔍 DEBUG: Could not fetch fresh data:`, debugError);
      }
    }

    // All content types that might need revalidation
    const allContentTypes = [
      'nyheter', 'lag', 'partners', 'personal', 'jobb', 'dokument',
      'nyhetskategorier', 'spelare', 'stab', 'pages', 'menus', 'footer', 'forms',
      'homepage', 'matcher'
    ];

    // Track what we revalidate for logging
    const revalidatedTags: string[] = [];
    const revalidatedPaths: string[] = [];

    // Revalidate cache tags
    revalidateTag('frontspace');
    revalidatedTags.push('frontspace');

    if (storeId) {
      revalidateTag(`frontspace-${storeId}`);
      revalidateTag(`frontspace-menu-${storeId}`);
      revalidateTag(`frontspace-data-${storeId}`);
      revalidatedTags.push(`frontspace-${storeId}`, `frontspace-menu-${storeId}`, `frontspace-data-${storeId}`);
    }

    for (const type of allContentTypes) {
      revalidateTag(type);
      revalidatedTags.push(type);
    }

    console.log(`🏷️  Revalidated tags: ${revalidatedTags.join(', ')}`);

    // Handle PAGE events - revalidate specific page paths
    if (event.startsWith('page.')) {
      const pageSlug = data.slug || data.page_slug || slug;
      if (pageSlug) {
        revalidatePath(`/${pageSlug}`);
        revalidatedPaths.push(`/${pageSlug}`);
      }
      revalidatePath('/');
      revalidatedPaths.push('/');
      console.log(`📄 PAGE event: revalidated paths: ${revalidatedPaths.join(', ')}`);
    }

    // Handle POST events - posts can appear on multiple pages (HeroSlider, etc.)
    if (event.startsWith('post.')) {
      revalidatePath('/');
      revalidatedPaths.push('/');

      if (postType && postType !== 'unknown') {
        revalidatePath(`/${postType}`);
        revalidatedPaths.push(`/${postType}`);
      }

      // For delete events or unknown postType, revalidate all common post type paths
      // This ensures deleted content is removed from archive pages
      if (event === 'post.deleted' || postType === 'unknown') {
        const commonPostTypePaths = ['/nyheter', '/lag', '/partners', '/personal', '/jobb', '/matcher'];
        for (const path of commonPostTypePaths) {
          revalidatePath(path);
          revalidatedPaths.push(path);
        }
      }

      // Specifically revalidate /matcher path for matcher post changes
      if (postType === 'matcher') {
        revalidatePath('/matcher');
        revalidatedPaths.push('/matcher');
      }

      console.log(`📝 POST event: revalidated paths: ${revalidatedPaths.join(', ')}`);
    }

    // Revalidate entire layout as fallback for all events
    revalidatePath('/', 'layout');
    revalidatedPaths.push('/ (layout)');

    console.log(`🔄 COMPLETE: event="${event}" | tags=${revalidatedTags.length} | paths=${revalidatedPaths.join(', ')}`);

    return NextResponse.json({
      success: true,
      message: `Revalidated ${postType}/${slug}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests (for webhook verification and manual testing)
 *
 * Test revalidation: GET /api/frontspace/webhook?secret=xxx&test=personal
 * This will revalidate the 'personal' tags without needing the full webhook
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const testPostType = request.nextUrl.searchParams.get('test');

  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // If test parameter provided, trigger revalidation
  if (testPostType) {
    const storeId = process.env.FRONTSPACE_STORE_ID || '';

    // All content types (including homepage for HeroSlider)
    const allContentTypes = [
      'nyheter', 'lag', 'partners', 'personal', 'jobb', 'dokument',
      'nyhetskategorier', 'spelare', 'stab', 'pages', 'menus', 'footer', 'forms',
      'homepage', 'matcher'
    ];

    // Revalidate all tags
    revalidateTag('frontspace');
    if (storeId) {
      revalidateTag(`frontspace-${storeId}`);
      revalidateTag(`frontspace-menu-${storeId}`);
      revalidateTag(`frontspace-data-${storeId}`);
    }
    for (const type of allContentTypes) {
      revalidateTag(type);
    }

    // Revalidate Full Route Cache - invalidates all statically generated pages
    revalidatePath('/', 'layout');

    console.log(`🧪 TEST: Revalidated tags + all pages via layout`);

    return NextResponse.json({
      message: `Test revalidation complete`,
      revalidatedTags: ['frontspace', ...allContentTypes, `frontspace-${storeId}`],
      timestamp: new Date().toISOString(),
    });
  }

  // Debug mode: fetch fresh data to compare
  const debug = request.nextUrl.searchParams.get('debug');
  if (debug === 'cache') {
    const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
    const storeId = process.env.FRONTSPACE_STORE_ID || '';

    // Fetch with cache (how Next.js normally fetches)
    const cachedResponse = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.FRONTSPACE_API_KEY || '',
      },
      body: JSON.stringify({
        query: `query { posts(storeId: "${storeId}", postTypeSlug: "nyheter", limit: 5) { posts { slug title } totalCount } }`,
      }),
      next: { tags: ['nyheter'] },
    });

    // Fetch without cache (fresh from API)
    const freshResponse = await fetch(FRONTSPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.FRONTSPACE_API_KEY || '',
      },
      body: JSON.stringify({
        query: `query { posts(storeId: "${storeId}", postTypeSlug: "nyheter", limit: 5) { posts { slug title } totalCount } }`,
      }),
      cache: 'no-store',
    });

    const cachedData = await cachedResponse.json();
    const freshData = await freshResponse.json();

    return NextResponse.json({
      message: 'Cache debug',
      cached: {
        totalCount: cachedData.data?.posts?.totalCount,
        posts: cachedData.data?.posts?.posts?.map((p: any) => p.slug),
      },
      fresh: {
        totalCount: freshData.data?.posts?.totalCount,
        posts: freshData.data?.posts?.posts?.map((p: any) => p.slug),
      },
      match: JSON.stringify(cachedData.data?.posts?.posts) === JSON.stringify(freshData.data?.posts?.posts),
    });
  }

  return NextResponse.json({
    message: 'Frontspace webhook endpoint active',
    timestamp: new Date().toISOString(),
    usage: 'Add ?test=postType to test revalidation, ?debug=cache to compare cached vs fresh data',
  });
}
