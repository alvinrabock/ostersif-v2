/**
 * robots.txt Route Handler
 *
 * Pattern: CMS First, Manual Fallback
 * Tries to fetch robots.txt from Frontspace CMS API first,
 * falls back to a default robots.txt if the API is unavailable.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const storeId = process.env.FRONTSPACE_STORE_ID
  const apiBaseUrl = (process.env.FRONTSPACE_ENDPOINT || '').replace('/v1/graphql', '')

  try {
    // Try CMS API first
    const response = await fetch(`${apiBaseUrl}/v1/seo/robots.txt/${storeId}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (response.ok) {
      const content = await response.text()
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    }
  } catch (error) {
    console.error('[robots.txt] API error:', error)
  }

  // Fallback to default robots.txt
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://ostersif.se'

  const defaultRobots = `User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /next/

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml`

  return new NextResponse(defaultRobots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
