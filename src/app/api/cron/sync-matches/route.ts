/**
 * Cron Endpoint for Match Data Sync
 *
 * Syncs match data from SMC API to Frontspace CMS
 * Designed to run on a schedule (e.g., every 15 minutes)
 *
 * RECOMMENDED: Use POST with header authentication (keeps secret out of logs)
 *
 * Example cron job (Coolify/self-hosted):
 * ```
 * curl -s -X POST \
 *   -H "x-cron-secret: YOUR_SECRET" \
 *   "https://your-domain.com/api/cron/sync-matches?season=all"
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncMatchesToCMS } from '@/lib/syncMatches';

// Secret for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/sync-matches
 * Triggers a full match sync from SMC API to CMS
 *
 * Query params:
 * - dryRun=true: Preview only, don't actually sync
 * - limit=N: Limit to first N matches (for testing)
 * - season=YYYY: Sync specific season (e.g., "2024", "2025")
 * - season=all: Sync ALL seasons
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel sends this in the Authorization header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');

  // Allow if either Vercel cron auth or our custom secret matches
  const isAuthorized =
    authHeader === `Bearer ${CRON_SECRET}` ||
    cronSecret === CRON_SECRET ||
    // In development, allow without secret
    (process.env.NODE_ENV === 'development' && !CRON_SECRET);

  if (!isAuthorized && CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse query params for testing options
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const season = request.nextUrl.searchParams.get('season') || undefined;

  console.log('🕐 Cron job triggered: sync-matches', { dryRun, limit, season });

  try {
    const result = await syncMatchesToCMS(undefined, season, { dryRun, limit });

    const modeLabel = dryRun ? '(DRY RUN) ' : '';
    const errorCount = result.errors.length;
    return NextResponse.json({
      success: result.success,
      dryRun,
      limit,
      message: `${modeLabel}Sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      errors: result.errors, // Include full error details
      details: result,
    });
  } catch (error) {
    console.error('❌ Cron sync-matches failed:', error);
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
 * GET /api/cron/sync-matches
 * Manual trigger for testing/debugging only
 *
 * NOTE: For production cron jobs, use POST with header auth instead
 * (keeps secret out of server access logs)
 *
 * Query params:
 * - secret=xxx: Auth secret (required in production)
 * - dryRun=true: Preview only, don't actually sync
 * - limit=N: Limit to first N matches (for testing)
 * - season=YYYY: Sync specific season (e.g., "2024", "2025")
 * - season=all: Sync ALL seasons
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const season = request.nextUrl.searchParams.get('season') || undefined;

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide ?secret=xxx' },
      { status: 401 }
    );
  }

  console.log('🕐 Manual sync triggered via GET', { dryRun, limit, season });

  try {
    const result = await syncMatchesToCMS(undefined, season, { dryRun, limit });

    const modeLabel = dryRun ? '(DRY RUN) ' : '';
    const errorCount = result.errors.length;
    return NextResponse.json({
      success: result.success,
      dryRun,
      limit,
      message: `${modeLabel}Sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      errors: result.errors, // Include full error details
      details: result,
    });
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
