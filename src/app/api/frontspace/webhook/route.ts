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
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
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
    const { event, postType, slug, id } = payload;

    // Revalidate based on post type
    switch (postType) {
      case 'nyheter':
        // Revalidate news listing and detail pages
        revalidatePath('/nyheter');
        if (slug) revalidatePath(`/nyhet/${slug}`);
        revalidateTag('nyheter');
        break;

      case 'lag':
        // Revalidate teams listing and detail pages
        revalidatePath('/lag');
        if (slug) revalidatePath(`/lag/${slug}`);
        revalidateTag('lag');
        break;

      case 'personal':
        // Revalidate staff pages
        revalidatePath('/om-oss/personal');
        revalidateTag('personal');
        break;

      case 'partners':
        // Revalidate partners pages
        revalidatePath('/partners');
        if (slug) revalidatePath(`/partner/${slug}`);
        revalidateTag('partners');
        break;

      case 'jobb':
        // Revalidate jobs listing
        revalidatePath('/karriar');
        if (slug) revalidatePath(`/jobb/${slug}`);
        revalidateTag('jobb');
        break;

      case 'dokument':
        // Revalidate documents
        revalidatePath('/dokument');
        revalidateTag('dokument');
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

      default:
        // Revalidate homepage for other content types
        revalidatePath('/');
        console.log(`📄 Revalidated root path for ${postType}`);
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
