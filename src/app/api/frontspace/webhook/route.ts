/**
 * Frontspace Webhook Handler
 * Handles content updates from Frontspace CMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

const WEBHOOK_SECRET = process.env.FRONTSPACE_WEBHOOK_SECRET;

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

  if (!receivedSignature) {
    return false;
  }

  // Generate HMAC signature using the secret and payload
  const { createHmac } = await import('crypto');
  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return receivedSignature === expectedSignature;
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

    // Frontspace sends data in nested structure: { event, data: { slug, post_type_id, ... } }
    const data = payload.data || payload;
    const slug = data.slug || payload.slug;

    // Try to get postType from various sources
    let rawPostType = payload.postType || data.postType;

    // If no direct postType, try to infer from post_type_id or content
    // For now, we'll need to map known post_type_ids or use a default
    if (!rawPostType && data.post_type_id) {
      // TODO: Add mapping of post_type_ids to post types if needed
      // For now, try to infer from content structure
      const content = typeof data.content === 'string' ? JSON.parse(data.content || '{}') : (data.content || {});

      if (content.kategori || content.kopplade_lag) {
        rawPostType = 'nyheter';
      } else if (content.partnerniva) {
        rawPostType = 'partners';
      } else if (content.avdelning) {
        rawPostType = 'personal';
      } else {
        rawPostType = 'unknown';
      }
    }

    // Normalize postType to lowercase for consistent matching
    const postType = rawPostType?.toLowerCase?.() || rawPostType;

    // Get store ID from payload or environment
    const storeId = payload.store_id || data.store_id || process.env.FRONTSPACE_STORE_ID || '';

    const event = payload.event || '';
    console.log(`🔔 Webhook received: event="${event}", postType="${postType}", slug="${slug}", storeId="${storeId}"`);

    // All content types that might need revalidation
    const allContentTypes = [
      'nyheter', 'lag', 'partners', 'personal', 'jobb', 'dokument',
      'nyhetskategorier', 'spelare', 'stab', 'pages', 'menus', 'footer', 'forms',
      'homepage'
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
      'homepage'
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

  return NextResponse.json({
    message: 'Frontspace webhook endpoint active',
    timestamp: new Date().toISOString(),
    usage: 'Add ?test=postType to test revalidation (e.g., ?test=personal)',
  });
}
