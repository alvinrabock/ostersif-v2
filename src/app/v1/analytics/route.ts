import { NextRequest, NextResponse } from 'next/server'

const ANALYTICS_ENDPOINT = process.env.FRONTSPACE_ANALYTICS_ENDPOINT || 'https://api.coolify.frontspace.se/v1/analytics'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get client IP for location detection
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || ''

    // Inject IP into request body (required by Umami for location detection)
    const bodyWithIp = {
      ...body,
      ip: clientIp,
    }

    const response = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientIp && { 'X-Forwarded-For': clientIp }),
      },
      body: JSON.stringify(bodyWithIp),
    })

    if (!response.ok) {
      return NextResponse.json({ success: false }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
