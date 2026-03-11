/**
 * API Endpoint for Turneringar (Leagues) Sync
 *
 * Syncs league data from SMC API cache to Frontspace CMS "Turneringar" post type
 *
 * Query params:
 * - dryRun=true: Preview only, don't actually sync
 * - limit=N: Limit to first N leagues (for testing)
 * - season=YYYY: Sync specific season (e.g., "2025")
 * - season=all: Sync ALL seasons
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncTurneringarToCMS, syncTurneringarFromSvFF } from '@/lib/syncTurneringar';

export async function POST(request: NextRequest) {
  // Only allow on localhost for now
  const host = request.headers.get('host') || '';
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('192.168.');

  if (!isLocalhost) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Parse query params
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const season = request.nextUrl.searchParams.get('season') || undefined;
  const source = request.nextUrl.searchParams.get('source') || 'smc';
  const from = request.nextUrl.searchParams.get('from') || undefined;
  const to = request.nextUrl.searchParams.get('to') || undefined;

  console.log('🕐 Turneringar sync triggered', { dryRun, limit, season, source });

  try {
    const result = source === 'svff'
      ? await syncTurneringarFromSvFF({ dryRun, limit })
      : await syncTurneringarToCMS({ dryRun, limit, season });

    const modeLabel = dryRun ? '(DRY RUN) ' : '';
    const errorCount = result.errors.length;

    return NextResponse.json({
      success: result.success,
      dryRun,
      limit,
      season,
      message: `${modeLabel}Sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      errors: result.errors,
      details: result,
    });
  } catch (error) {
    console.error('❌ Turneringar sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
