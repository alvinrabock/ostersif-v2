/**
 * Cron Endpoint for SvFF Game Sync
 *
 * Syncs match data from SvFF API to Frontspace CMS.
 * Covers ALL club teams: herrar, damer, youth, etc.
 *
 * RECOMMENDED: Use POST with header authentication (keeps secret out of logs)
 *
 * Example cron job:
 * ```
 * curl -s -X POST \
 *   -H "x-cron-secret: YOUR_SECRET" \
 *   "https://your-domain.com/api/cron/sync-svff-games"
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncSvffMatchesToCMS } from '@/lib/syncSvffMatches';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/sync-svff-games
 * Triggers SvFF game sync to CMS
 *
 * Query params:
 * - dryRun=true: Preview only, don't actually sync
 * - limit=N: Limit to first N games (for testing)
 * - from=YYYY-MM-DD: Custom start date
 * - to=YYYY-MM-DD: Custom end date
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');

  const isAuthorized =
    authHeader === `Bearer ${CRON_SECRET}` ||
    cronSecret === CRON_SECRET ||
    (process.env.NODE_ENV === 'development' && !CRON_SECRET);

  if (!isAuthorized && CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const from = request.nextUrl.searchParams.get('from') || undefined;
  const to = request.nextUrl.searchParams.get('to') || undefined;

  console.log('🕐 Cron job triggered: sync-svff-games', { dryRun, limit, from, to });

  try {
    const result = await syncSvffMatchesToCMS({ dryRun, limit, from, to });

    const modeLabel = dryRun ? '(DRY RUN) ' : '';
    const errorCount = result.errors.length;
    return NextResponse.json({
      success: result.success,
      dryRun,
      limit,
      message: `${modeLabel}SvFF sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      errors: result.errors,
      details: result,
    });
  } catch (error) {
    console.error('❌ Cron sync-svff-games failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/sync-svff-games
 * Manual trigger for testing/debugging
 *
 * Query params:
 * - secret=xxx: Auth secret (required in production)
 * - dryRun=true: Preview only
 * - limit=N: Limit games
 * - from=YYYY-MM-DD: Custom start date
 * - to=YYYY-MM-DD: Custom end date
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const from = request.nextUrl.searchParams.get('from') || undefined;
  const to = request.nextUrl.searchParams.get('to') || undefined;

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide ?secret=xxx' },
      { status: 401 }
    );
  }

  console.log('🕐 Manual SvFF sync triggered via GET', { dryRun, limit, from, to });

  try {
    const result = await syncSvffMatchesToCMS({ dryRun, limit, from, to });

    const modeLabel = dryRun ? '(DRY RUN) ' : '';
    const errorCount = result.errors.length;
    return NextResponse.json({
      success: result.success,
      dryRun,
      limit,
      message: `${modeLabel}SvFF sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      errors: result.errors,
      details: result,
    });
  } catch (error) {
    console.error('❌ Manual SvFF sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
