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

    // Revalidate based on post type
    switch (postType) {
      case 'nyheter':
        // Revalidate news listing and detail pages
        revalidatePath('/nyheter');
        if (slug) revalidatePath(`/nyhet/${slug}`);
        revalidateTag('nyheter');
        revalidateTag('posts-data'); // Apollo client uses this tag
        console.log(`📰 Revalidated nyheter: ${slug || 'all'}`);
        break;

      case 'nyhetskategorier':
        // Revalidate news categories
        revalidatePath('/nyheter');
        revalidateTag('nyhetskategorier');
        revalidateTag('nyheter');
        revalidateTag('categories-data'); // Apollo client uses this tag
        console.log(`🏷️ Revalidated nyhetskategorier`);
        break;

      case 'lag':
        // Revalidate teams listing and detail pages
        revalidatePath('/lag');
        if (slug) revalidatePath(`/lag/${slug}`);
        revalidateTag('lag');
        revalidateTag('lag-data'); // Apollo client uses this tag
        revalidateTag('frontspace');
        console.log(`⚽ Revalidated lag: ${slug || 'all'}`);
        break;

      case 'personal':
        // Revalidate staff pages
        revalidatePath('/om-oss/personal');
        revalidatePath('/kontakt');
        revalidateTag('personal');
        revalidateTag('personal-data'); // Apollo client uses this tag
        console.log(`👥 Revalidated personal`);
        break;

      case 'personalavdelningar':
        // Revalidate personal avdelningar (departments)
        revalidatePath('/om-oss/personal');
        revalidatePath('/kontakt');
        revalidateTag('personal');
        revalidateTag('personal-data'); // Apollo client uses this tag
        console.log(`👥 Revalidated personalavdelningar`);
        break;

      case 'partners':
        // Revalidate partners pages
        revalidatePath('/partners');
        if (slug) revalidatePath(`/partner/${slug}`);
        revalidateTag('partners');
        revalidateTag('partners-data'); // Apollo client uses this tag
        revalidateTag('partnernivaer-data'); // Partner levels also use partners
        console.log(`🤝 Revalidated partners: ${slug || 'all'}`);
        break;

      case 'partnernivaer':
        // Revalidate partner levels
        revalidatePath('/partners');
        revalidateTag('partners');
        revalidateTag('partners-data');
        revalidateTag('partnernivaer-data'); // Apollo client uses this tag
        console.log(`🏆 Revalidated partnernivaer`);
        break;

      case 'jobb':
        // Revalidate jobs listing and detail pages
        revalidatePath('/jobb');
        if (slug) revalidatePath(`/jobb/${slug}`);
        revalidateTag('jobb');
        revalidateTag('jobb-data'); // Apollo client uses this tag
        console.log(`💼 Revalidated jobb: ${slug || 'all'}`);
        break;

      case 'dokument':
        // Revalidate documents
        revalidatePath('/dokument');
        revalidateTag('dokument');
        revalidateTag('documents-data'); // Apollo client uses this tag
        console.log(`📄 Revalidated dokument`);
        break;

      case 'foretagspaket':
      case 'partnerpaket':
        // Revalidate företagspaket/partnerpaket
        revalidatePath('/partners');
        revalidateTag('foretagspaket');
        revalidateTag('foretagspaket-data'); // Apollo client uses this tag
        console.log(`📦 Revalidated foretagspaket`);
        break;

      case 'foretagspaketkategorier':
      case 'partnerpaket-kategorier':
        // Revalidate företagspaket categories
        revalidatePath('/partners');
        revalidateTag('foretagspaketkategorier');
        revalidateTag('foretagspaketkategorier-data'); // Apollo client uses this tag
        revalidateTag('foretagspaket-data'); // Also invalidate paket since categories affect them
        console.log(`🏷️ Revalidated foretagspaketkategorier`);
        break;

      case 'pages':
      case 'sidor':
        // Revalidate pages
        if (slug) {
          // Revalidate specific page
          const pagePath = slug === 'home' ? '/' : `/${slug}`;
          revalidatePath(pagePath);
          console.log(`📄 Revalidated page: ${pagePath}`);
        }
        revalidateTag('pages');
        break;

      case 'menus':
        // Revalidate menus (affects header/footer)
        revalidateTag('menus');
        revalidatePath('/', 'layout');
        console.log(`📋 Revalidated menus`);
        break;

      case 'footer':
        // Revalidate footer
        revalidateTag('footer');
        revalidatePath('/', 'layout');
        console.log(`📋 Revalidated footer`);
        break;

      case 'spelare':
        // Revalidate player data - affects team pages
        revalidateTag('spelare');
        revalidatePath('/lag');
        revalidateTag('lag'); // Also revalidate lag since players are shown on team pages
        console.log(`👤 Revalidated spelare`);
        break;

      case 'stab':
        // Revalidate staff data - affects team pages
        revalidateTag('stab');
        revalidatePath('/lag');
        revalidateTag('lag'); // Also revalidate lag since staff are shown on team pages
        console.log(`👔 Revalidated stab`);
        break;

      case 'forms':
        // Revalidate forms
        revalidateTag('forms');
        console.log(`📝 Revalidated forms`);
        break;

      default:
        // Revalidate homepage and the general frontspace tag for other content types
        revalidatePath('/');
        revalidateTag('frontspace');
        revalidateTag(postType); // Also revalidate the specific post type tag
        console.log(`📄 Revalidated root path and tag for ${postType}`);
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
 * Handle GET requests (for webhook verification)
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (secret === WEBHOOK_SECRET) {
    return NextResponse.json({
      message: 'Frontspace webhook endpoint active',
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
