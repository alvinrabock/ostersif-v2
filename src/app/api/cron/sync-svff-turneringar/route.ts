/**
 * Cron Endpoint for SvFF Turneringar Sync
 *
 * Syncs competition/league data from SvFF API to Frontspace CMS.
 * Fetches all competitions for herr + dam senior teams and links to CMS lag.
 *
 * RECOMMENDED: Use POST with header authentication (keeps secret out of logs)
 *
 * Example cron job:
 * ```
 * curl -s -X POST \
 *   -H "x-cron-secret: YOUR_SECRET" \
 *   "https://your-domain.com/api/cron/sync-svff-turneringar"
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncTurneringarFromSvFF } from '@/lib/syncTurneringar';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/sync-svff-turneringar
 * Triggers SvFF turneringar sync to CMS
 *
 * Query params:
 * - dryRun=true: Preview only, don't actually sync
 * - limit=N: Limit to first N competitions (for testing)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');

  const isAuthorized =
    authHeader === `Bearer ${CRON_SECRET}` ||
    cronSecret === CRON_SECRET ||
    (process.env.NODE_ENV === 'development' && !CRON_SECRET);

  if (!isAuthorized && CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  console.log('🕐 Cron job triggered: sync-svff-turneringar', { dryRun, limit });

  try {
    const result = await syncTurneringarFromSvFF({ dryRun, limit });

    const modeLabel = dryRun ? '(DRY RUN) ' : '';
    const errorCount = result.errors.length;
    return NextResponse.json({
      success: result.success,
      dryRun,
      limit,
      message: `${modeLabel}SvFF turneringar sync: ${result.created} created, ${result.updated} updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      errors: result.errors,
      details: result,
    });
  } catch (error) {
    console.error('❌ Cron sync-svff-turneringar failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/sync-svff-turneringar
 * Manual trigger for testing/debugging
 *
 * Query params:
 * - secret=xxx: Auth secret (required in production)
 * - dryRun=true: Preview only
 * - limit=N: Limit competitions
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized. Provide ?secret=xxx' }, { status: 401 });
  }

  console.log('🕐 Manual SvFF turneringar sync via GET', { dryRun, limit });

  try {
    const result = await syncTurneringarFromSvFF({ dryRun, limit });

    const modeLabel = dryRun ? '(DRY RUN) ' : '';
    const errorCount = result.errors.length;
    return NextResponse.json({
      success: result.success,
      dryRun,
      limit,
      message: `${modeLabel}SvFF turneringar sync: ${result.created} created, ${result.updated} updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      errors: result.errors,
      details: result,
    });
  } catch (error) {
    console.error('❌ Manual SvFF turneringar sync failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
