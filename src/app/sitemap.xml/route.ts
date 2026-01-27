/**
 * Sitemap XML Route Handler
 *
 * Generates a dynamic sitemap for SEO
 * Combines static routes with dynamic content from Frontspace CMS
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

// Extended page type with dates
interface CMSPage {
  id: string
  title: string
  slug: string
  fullPath: string
  updated_at?: string
  created_at?: string
}

interface SitemapEntry {
  url: string
  lastModified: Date
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

// Static routes with their SEO configuration
const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/nyheter', priority: 0.9, changeFrequency: 'hourly' as const },
  { path: '/lag', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/matcher', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/jobb', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/dokument', priority: 0.5, changeFrequency: 'monthly' as const },
]

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${formatDate(entry.lastModified)}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://ostersif.se'

  try {
    // Fetch all data in parallel for efficiency
    const [pages, nyheterResult, lagResult, jobbResult, nyhetskategorier] = await Promise.all([
      fetchAllPagesCached({ limit: 500 }),
      frontspace.nyheter.getAll({ limit: 500 }),
      frontspace.lag.getAll({ limit: 100 }),
      frontspace.jobb.getAll({ limit: 100 }),
      fetchAllNyhetskategorier(),
    ])

    const entries: SitemapEntry[] = []

    // 1. Static routes
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${siteUrl}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })
    }

    // 2. CMS Pages (with nested hierarchy support)
    if (pages && pages.length > 0) {
      const pagesWithPaths = buildPagePaths(pages) as CMSPage[]
      for (const page of pagesWithPaths) {
        // Skip home page as it's already in static routes
        if (page.fullPath === '/') continue

        entries.push({
          url: `${siteUrl}${page.fullPath}`,
          lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }

    // 3. News articles
    if (nyheterResult?.posts) {
      for (const nyhet of nyheterResult.posts as CMSPost[]) {
        entries.push({
          url: `${siteUrl}/nyhet/${nyhet.slug}`,
          lastModified: nyhet.updated_at
            ? new Date(nyhet.updated_at)
            : nyhet.published_at
              ? new Date(nyhet.published_at)
              : new Date(),
          changeFrequency: 'monthly',
          priority: 0.6,
        })
      }
    }

    // 4. News categories (archive pages)
    if (nyhetskategorier && nyhetskategorier.length > 0) {
      for (const kategori of nyhetskategorier) {
        entries.push({
          url: `${siteUrl}/nyheter/${kategori.slug}`,
          lastModified: kategori.updatedAt ? new Date(kategori.updatedAt) : new Date(),
          changeFrequency: 'daily',
          priority: 0.7,
        })
      }
    }

    // 6. Teams (skip teams that link directly to Sportadmin)
    if (lagResult?.posts) {
      for (const lag of lagResult.posts as CMSPost[]) {
        // Skip teams that redirect to external Sportadmin
        const linksToSportadmin =
          lag.content?.lanka_helt_till_sportadmin === true ||
          lag.content?.lanka_helt_till_sportadmin === 'true'

        if (linksToSportadmin) continue

        entries.push({
          url: `${siteUrl}/lag/${lag.slug}`,
          lastModified: lag.updated_at ? new Date(lag.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }

    // 7. Job postings
    if (jobbResult?.posts) {
      for (const jobb of jobbResult.posts as CMSPost[]) {
        entries.push({
          url: `${siteUrl}/jobb/${jobb.slug}`,
          lastModified: jobb.updated_at ? new Date(jobb.updated_at) : new Date(),
          changeFrequency: 'daily',
          priority: 0.5,
        })
      }
    }

    const xml = generateSitemapXml(entries)

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('[sitemap.xml] Generation error:', error)

    // Fallback minimal sitemap
    const fallbackEntries: SitemapEntry[] = STATIC_ROUTES.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }))

    const xml = generateSitemapXml(fallbackEntries)

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}
