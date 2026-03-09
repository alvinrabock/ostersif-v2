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
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.ostersif.se'
  const sitemapLine = `Sitemap: ${siteUrl}/sitemap.xml`

  try {
    // Try CMS API first
    const response = await fetch(`${apiBaseUrl}/v1/seo/robots.txt/${storeId}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (response.ok) {
      let content = await response.text()
      // Validate that CMS response has proper User-agent rules, not just a Sitemap line
      const hasUserAgent = content.toLowerCase().includes('user-agent:')
      if (hasUserAgent) {
        // Ensure Sitemap line is always present
        if (!content.toLowerCase().includes('sitemap:')) {
          content = content.trimEnd() + '\n\n' + sitemapLine
        }
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        })
      }
      // If CMS response is incomplete (no User-agent rules), fall through to default
    }
  } catch (error) {
    console.error('[robots.txt] API error:', error)
  }

  // Fallback to default robots.txt
  const defaultRobots = `User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /next/

# Sitemap
${sitemapLine}`

  return new NextResponse(defaultRobots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
