import { NextRequest, NextResponse } from 'next/server'

const SPORTOMEDIA_BASE_URL = 'https://api.sportomedia.se'

export async function GET(request: NextRequest) {
  // Only allow on localhost
  const host = request.headers.get('host') || ''
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('192.168.')

  if (!isLocalhost) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
  }

  const apiKey = process.env.SUPERADMIN_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'SUPERADMIN_KEY not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(`${SPORTOMEDIA_BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey,
      },
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
