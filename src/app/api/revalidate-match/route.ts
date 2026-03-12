import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { syncSingleMatch } from '@/lib/syncMatches'

// Events that change CMS-stored data (scores, status).
// Other events (cards, subs, lineups) only need cache revalidation
// since live data is fetched from SMC API at render time.
const CMS_SYNC_EVENTS = new Set(['GOAL', 'MATCH_STARTED', 'MATCH_FINISHED', 'MATCH_UPDATE'])

export async function POST(request: NextRequest) {
  try {
    const { matchId, leagueId, eventType, secret } = await request.json()

    // Verify secret to prevent unauthorized calls
    if (secret !== process.env.SERVICE_BUS_REVALIDATE_SECRET) {
      console.warn('Unauthorized revalidation attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Phase 1: CMS Sync (for score/status-changing events only)
    // Fetches latest match data from SMC API and updates Frontspace CMS.
    // Skips non-Östers IF matches automatically.
    let syncResult: { success: boolean; error?: string } | null = null
    if (matchId && CMS_SYNC_EVENTS.has(eventType)) {
      try {
        syncResult = await syncSingleMatch(
          String(matchId),
          leagueId ? String(leagueId) : undefined
        )
        if (syncResult.success) {
          console.log(`CMS sync OK for match ${matchId} (${eventType})`)
        } else {
          console.warn(`CMS sync failed for match ${matchId}: ${syncResult.error}`)
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        syncResult = { success: false, error: errMsg }
        console.error(`CMS sync error for match ${matchId}:`, errMsg)
        // Continue to cache revalidation — never skip it
      }
    }

    // Phase 2: Cache Revalidation (for ALL events)
    switch (eventType) {
      case 'GOAL':
      case 'YELLOW_CARD':
      case 'RED_CARD':
      case 'SUBSTITUTION':
        // Live match events - invalidate match and live data
        revalidateTag(`match-${matchId}`)
        revalidateTag(`match-events-${matchId}`)
        revalidateTag(`match-live-${matchId}`)
        break

      case 'LINEUP_PUBLISHED':
        // Lineup events - only invalidate lineup cache
        revalidateTag(`match-lineup-${matchId}`)
        revalidateTag(`match-${matchId}`)
        break

      case 'MATCH_STARTED':
        // Match started - invalidate match list and match page
        revalidateTag(`match-${matchId}`)
        revalidateTag('matches-list')
        break

      case 'MATCH_FINISHED':
        // Match finished - invalidate everything related
        revalidateTag(`match-${matchId}`)
        revalidateTag('matches-list')
        revalidateTag('finished-matches')
        break

      default:
        // Unknown event type - invalidate match and list
        revalidateTag(`match-${matchId}`)
        revalidateTag('matches-list')
    }

    // If CMS was updated, also revalidate the CMS-first data fetching cache
    if (syncResult?.success) {
      revalidateTag('matcher')
      revalidateTag('frontspace')
    }

    // Revalidate specific paths
    if (leagueId && matchId) {
      revalidatePath(`/matcher/${leagueId}/${matchId}`)
    }
    revalidatePath('/matcher')

    console.log(`Revalidated cache for match ${matchId} (${eventType})`)
    return NextResponse.json({
      revalidated: true,
      synced: syncResult?.success ?? null,
      syncError: syncResult?.error || undefined,
      matchId,
      leagueId,
      eventType,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error processing revalidation request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Also allow GET for testing/health checks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Revalidation endpoint is ready (with CMS sync)',
    timestamp: new Date().toISOString()
  })
}
