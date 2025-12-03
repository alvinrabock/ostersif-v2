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
    const { postType: rawPostType, slug } = payload;

    // Normalize postType to lowercase for consistent matching
    const postType = rawPostType?.toLowerCase?.() || rawPostType;

    console.log(`🔔 Webhook received: postType="${rawPostType}" (normalized: "${postType}"), slug="${slug}"`);
    console.log(`📦 Full payload:`, JSON.stringify(payload, null, 2));

    // Tag mappings: Frontspace tags -> Apollo tags (for backwards compatibility)
    // Pages with revalidate=0 will automatically get fresh data when tags are invalidated
    const tagMappings: Record<string, string[]> = {
      'nyheter': ['nyheter', 'posts-data'],
      'nyhetskategorier': ['nyhetskategorier', 'nyheter', 'categories-data'],
      'lag': ['lag', 'lag-data', 'frontspace'],
      'personal': ['personal', 'personalavdelningar', 'personal-data'],
      'personalavdelningar': ['personal', 'personalavdelningar', 'personal-data'],
      'partners': ['partners', 'partners-data', 'partnernivaer-data'],
      'partnernivaer': ['partners', 'partners-data', 'partnernivaer-data'],
      'jobb': ['jobb', 'jobb-data'],
      'dokument': ['dokument', 'documents-data'],
      'foretagspaket': ['foretagspaket', 'foretagspaket-data'],
      'partnerpaket': ['foretagspaket', 'foretagspaket-data'],
      'foretagspaketkategorier': ['foretagspaketkategorier', 'foretagspaketkategorier-data', 'foretagspaket-data'],
      'partnerpaket-kategorier': ['foretagspaketkategorier', 'foretagspaketkategorier-data', 'foretagspaket-data'],
      'spelare': ['spelare', 'lag', 'lag-data'],
      'stab': ['stab', 'lag', 'lag-data'],
      'forms': ['forms'],
      'menus': ['menus'],
      'footer': ['footer'],
      'pages': ['pages'],
      'sidor': ['pages'],
    };

    // Get tags to revalidate for this post type
    const tagsToRevalidate = tagMappings[postType] || ['frontspace', postType];

    // Revalidate all relevant tags
    for (const tag of tagsToRevalidate) {
      revalidateTag(tag);
    }
    console.log(`🏷️ Revalidated tags: ${tagsToRevalidate.join(', ')}`);

    // Special cases that need path revalidation (layout-level changes)
    if (postType === 'menus' || postType === 'footer') {
      revalidatePath('/', 'layout');
      console.log(`📋 Revalidated layout`);
    }

    // Revalidate specific page slug if provided for pages/sidor
    if ((postType === 'pages' || postType === 'sidor') && slug) {
      const pagePath = slug === 'home' ? '/' : `/${slug}`;
      revalidatePath(pagePath);
      console.log(`📄 Revalidated page path: ${pagePath}`);
    }

    // Revalidate specific detail pages with known routes
    if (slug) {
      const detailRoutes: Record<string, string> = {
        'nyheter': `/nyhet/${slug}`,
        'lag': `/lag/${slug}`,
        'jobb': `/jobb/${slug}`,
        'partners': `/partner/${slug}`,
      };
      if (detailRoutes[postType]) {
        revalidatePath(detailRoutes[postType]);
        console.log(`📄 Revalidated detail page: ${detailRoutes[postType]}`);
      }
    }

    // Also revalidate homepage if content is marked for homepage display
    if (payload.visaPaHemsida) {
      revalidatePath('/');
      console.log('🏠 Revalidated homepage');
    }

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

  // If test parameter provided, trigger revalidation for that post type
  if (testPostType) {
    const tagMappings: Record<string, string[]> = {
      'nyheter': ['nyheter', 'posts-data'],
      'nyhetskategorier': ['nyhetskategorier', 'nyheter', 'categories-data'],
      'lag': ['lag', 'lag-data', 'frontspace'],
      'personal': ['personal', 'personalavdelningar', 'personal-data'],
      'personalavdelningar': ['personal', 'personalavdelningar', 'personal-data'],
      'partners': ['partners', 'partners-data', 'partnernivaer-data'],
      'partnernivaer': ['partners', 'partners-data', 'partnernivaer-data'],
      'jobb': ['jobb', 'jobb-data'],
      'dokument': ['dokument', 'documents-data'],
      'foretagspaket': ['foretagspaket', 'foretagspaket-data'],
      'partnerpaket': ['foretagspaket', 'foretagspaket-data'],
      'foretagspaketkategorier': ['foretagspaketkategorier', 'foretagspaketkategorier-data', 'foretagspaket-data'],
      'partnerpaket-kategorier': ['foretagspaketkategorier', 'foretagspaketkategorier-data', 'foretagspaket-data'],
      'spelare': ['spelare', 'lag', 'lag-data'],
      'stab': ['stab', 'lag', 'lag-data'],
      'forms': ['forms'],
      'menus': ['menus'],
      'footer': ['footer'],
      'pages': ['pages'],
      'sidor': ['pages'],
    };

    const tagsToRevalidate = tagMappings[testPostType.toLowerCase()] || ['frontspace', testPostType];

    for (const tag of tagsToRevalidate) {
      revalidateTag(tag);
    }

    console.log(`🧪 TEST: Revalidated tags for ${testPostType}: ${tagsToRevalidate.join(', ')}`);

    return NextResponse.json({
      message: `Test revalidation complete for ${testPostType}`,
      revalidatedTags: tagsToRevalidate,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    message: 'Frontspace webhook endpoint active',
    timestamp: new Date().toISOString(),
    usage: 'Add ?test=postType to test revalidation (e.g., ?test=personal)',
  });
}
