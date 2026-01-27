/**
 * Webhook trigger endpoint - redirects to main webhook handler
 * This allows Frontspace CMS to call /api/webhooks/trigger
 */

import { NextRequest } from 'next/server';
import { POST as webhookPOST, GET as webhookGET } from '../../frontspace/webhook/route';

export async function POST(request: NextRequest) {
  return webhookPOST(request);
}

export async function GET(request: NextRequest) {
  return webhookGET(request);
}
