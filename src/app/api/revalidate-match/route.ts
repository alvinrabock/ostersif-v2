import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { matchId, leagueId, eventType, secret } = await request.json()

    // Verify secret to prevent unauthorized calls
    if (secret !== process.env.SERVICE_BUS_REVALIDATE_SECRET) {
      console.warn('Unauthorized revalidation attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Revalidate based on event type for surgical cache invalidation
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

    // Revalidate specific paths
    if (leagueId && matchId) {
      revalidatePath(`/matcher/${leagueId}/${matchId}`)
    }
    revalidatePath('/matcher')

    console.log(`Revalidated cache for match ${matchId} (${eventType})`)
    return NextResponse.json({
      revalidated: true,
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
    message: 'Revalidation endpoint is ready',
    timestamp: new Date().toISOString()
  })
}
