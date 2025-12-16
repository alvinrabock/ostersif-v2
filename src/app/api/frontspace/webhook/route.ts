/**
 * Frontspace Webhook Handler
 * Handles content updates from Frontspace CMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

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

    console.log(`🔔 Webhook received: event="${payload.event}", postType="${postType}", slug="${slug}", storeId="${storeId}"`);

    // All content types that might need revalidation
    // Since we can't always reliably detect postType from payload, revalidate all common types
    // Also includes 'homepage' for HeroSlider and other homepage-specific content
    const allContentTypes = [
      'nyheter', 'lag', 'partners', 'personal', 'jobb', 'dokument',
      'nyhetskategorier', 'spelare', 'stab', 'pages', 'menus', 'footer', 'forms',
      'homepage'
    ];

    // Revalidate cache tags that match what the client uses:
    // 1. Global frontspace tag
    revalidateTag('frontspace');

    // 2. Store-specific tags (used by frontspace-client.ts)
    if (storeId) {
      revalidateTag(`frontspace-${storeId}`);
      revalidateTag(`frontspace-menu-${storeId}`);
      revalidateTag(`frontspace-data-${storeId}`);
    }

    // 3. All content type tags (to ensure nothing is missed)
    for (const type of allContentTypes) {
      revalidateTag(type);
    }

    // Revalidate entire site to ensure all pages refresh
    // Use 'layout' type to invalidate Full Route Cache for all pages under root layout
    revalidatePath('/', 'layout');

    // Also revalidate specific dynamic route patterns to ensure catch-all routes are invalidated
    // This ensures pages with custom blocks (like HeroSlider) get fresh data
    revalidatePath('/[slug]', 'page');
    revalidatePath('/[...slug]', 'page');
    revalidatePath('/nyhet/[slug]', 'page');
    revalidatePath('/nyheter', 'page');
    revalidatePath('/nyheter/[...slug]', 'page');
    revalidatePath('/lag', 'page');
    revalidatePath('/lag/[slug]', 'page');
    revalidatePath('/matcher', 'page');
    revalidatePath('/');

    console.log(`🔄 Revalidated: all content types + frontspace-${storeId} + all page routes`);

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

    // Revalidate entire site and all dynamic routes
    revalidatePath('/', 'layout');
    revalidatePath('/[slug]', 'page');
    revalidatePath('/[...slug]', 'page');
    revalidatePath('/nyhet/[slug]', 'page');
    revalidatePath('/nyheter', 'page');
    revalidatePath('/nyheter/[...slug]', 'page');
    revalidatePath('/lag', 'page');
    revalidatePath('/lag/[slug]', 'page');
    revalidatePath('/matcher', 'page');
    revalidatePath('/');

    console.log(`🧪 TEST: Revalidated all content types + all page routes`);

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
