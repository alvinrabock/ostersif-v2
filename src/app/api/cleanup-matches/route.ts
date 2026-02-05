/**
 * Preview Endpoint for Non-Östers IF Matches
 *
 * READ-ONLY: Shows which matches would be deleted (non-Östers IF matches).
 * Does NOT delete anything - use Frontspace CMS admin or database to delete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { previewNonOstersMatches } from '@/lib/syncMatches';

/**
 * GET /api/cleanup-matches
 * Preview which matches are non-Östers IF (read-only, no deletion)
 */
export async function GET(_request: NextRequest) {
  console.log('🔍 Preview triggered: listing non-Östers IF matches');

  try {
    const result = await previewNonOstersMatches();

    return NextResponse.json({
      success: result.success,
      message: `Found ${result.toDelete.length} non-Östers IF matches to delete, ${result.toKeep.length} to keep`,
      toDeleteCount: result.toDelete.length,
      toKeepCount: result.toKeep.length,
      toDelete: result.toDelete,
      toKeep: result.toKeep,
      instructions: 'Delete these matches manually in Frontspace CMS admin or database. IDs are provided for each match.',
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('❌ Preview failed:', error);
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
 * POST /api/cleanup-matches
 * Same as GET - just preview, no deletion
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
