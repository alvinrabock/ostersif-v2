/**
 * llms.txt Route Handler
 *
 * Pattern: CMS First, Manual Fallback
 * Provides information for AI/LLM crawlers about the site content.
 * Tries CMS API first, falls back to dynamically generated content.
 */

import { NextResponse } from 'next/server'
import { fetchAllPagesCached, frontspace } from '@/lib/frontspace/client'
import { buildPagePaths } from '@/utils/pageRouting'
import { fetchAllNyhetskategorier } from '@/lib/frontspace/adapters/nyhetskategorier'

// Type for CMS posts
interface CMSPost {
  id: string
  title: string
  slug: string
  content?: Record<string, unknown>
  updated_at?: string
  published_at?: string
}

/**
 * Generate default llms.txt content from CMS data
 */
async function generateDefaultLlmsTxt(siteUrl: string): Promise<string> {
  // Fetch content in parallel
  const [pages, nyheterResult, lagResult, jobbResult, nyhetskategorier] = await Promise.all([
    fetchAllPagesCached({ limit: 50 }),
    frontspace.nyheter.getAll({ limit: 20 }),
    frontspace.lag.getAll({ limit: 50 }),
    frontspace.jobb.getAll({ limit: 20 }),
    fetchAllNyhetskategorier(),
  ])

  let content = `# Östers IF - Official Website

> Östers IF is a Swedish football club based in Växjö, founded in 1930. This website contains information about the club, teams, news, matches, and more.

## Main Sections

- Homepage: ${siteUrl}/
- News (Nyheter): ${siteUrl}/nyheter
- Teams (Lag): ${siteUrl}/lag
- Matches (Matcher): ${siteUrl}/matcher
- Documents (Dokument): ${siteUrl}/dokument
- Jobs (Jobb): ${siteUrl}/jobb
`

  // Add CMS pages
  if (pages && pages.length > 0) {
    const pagesWithPaths = buildPagePaths(pages)
    content += `\n## Pages\n`
    for (const page of pagesWithPaths.slice(0, 20)) {
      if (page.fullPath === '/') continue // Skip home
      content += `- ${page.title}: ${siteUrl}${page.fullPath}\n`
    }
  }

  // Add recent news
  if (nyheterResult?.posts && nyheterResult.posts.length > 0) {
    content += `\n## Recent News\n`
    for (const nyhet of (nyheterResult.posts as CMSPost[]).slice(0, 10)) {
      content += `- ${nyhet.title}: ${siteUrl}/nyhet/${nyhet.slug}\n`
    }
  }

  // Add news categories
  if (nyhetskategorier && nyhetskategorier.length > 0) {
    content += `\n## News Categories\n`
    for (const kategori of nyhetskategorier) {
      content += `- ${kategori.title}: ${siteUrl}/nyheter/${kategori.slug}\n`
    }
  }

  // Add teams
  if (lagResult?.posts && lagResult.posts.length > 0) {
    content += `\n## Teams\n`
    for (const lag of lagResult.posts as CMSPost[]) {
      // Skip teams that redirect to external Sportadmin
      const linksToSportadmin =
        lag.content?.lanka_helt_till_sportadmin === true ||
        lag.content?.lanka_helt_till_sportadmin === 'true'

      if (linksToSportadmin) continue
      content += `- ${lag.title}: ${siteUrl}/lag/${lag.slug}\n`
    }
  }

  // Add current job openings
  if (jobbResult?.posts && jobbResult.posts.length > 0) {
    content += `\n## Current Job Openings\n`
    for (const jobb of jobbResult.posts as CMSPost[]) {
      content += `- ${jobb.title}: ${siteUrl}/jobb/${jobb.slug}\n`
    }
  }

  content += `
## About Östers IF

Östers IF (Östers Idrottsförening) is one of Sweden's most storied football clubs, founded in 1930 in Växjö. The club has a rich history in Swedish football and plays its home matches at Myresjöhus Arena.

## Contact

- Website: ${siteUrl}
- Location: Myresjöhus Arena, Arenagatan 11, 352 46 Växjö, Sweden
`

  return content
}

export async function GET() {
  const storeId = process.env.FRONTSPACE_STORE_ID
  const apiBaseUrl = (process.env.FRONTSPACE_ENDPOINT || '').replace('/v1/graphql', '')
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://ostersif.se'

  try {
    // Try CMS API first
    const response = await fetch(`${apiBaseUrl}/v1/seo/llms.txt/${storeId}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (response.ok) {
      const content = await response.text()
      // Check if valid content (not an error page)
      if (content && !content.toLowerCase().includes('not found') && content.trim().length > 0) {
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        })
      }
    }
  } catch (error) {
    console.error('[llms.txt] API error:', error)
  }

  // Fallback to generated content
  try {
    const generatedContent = await generateDefaultLlmsTxt(siteUrl)
    return new NextResponse(generatedContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[llms.txt] Generation error:', error)

    // Ultimate fallback - minimal content
    const minimalContent = `# Östers IF - Official Website

> Östers IF is a Swedish football club based in Växjö, founded in 1930.

## Main Sections
- Homepage: ${siteUrl}/
- News: ${siteUrl}/nyheter
- Teams: ${siteUrl}/lag
- Matches: ${siteUrl}/matcher
`

    return new NextResponse(minimalContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}
