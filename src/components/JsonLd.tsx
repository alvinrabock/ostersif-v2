/**
 * JSON-LD Structured Data Components
 *
 * Provides Schema.org structured data for SEO
 * Includes Organization, WebSite, NewsArticle, and BreadcrumbList schemas
 */

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.ostersif.se'

/**
 * Organization + SportsTeam schema for Östers IF
 */
export function OrganizationJsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': ['SportsTeam', 'Organization'],
    '@id': `${siteUrl}/#organization`,
    name: 'Östers IF',
    alternateName: 'Östers Idrottsförening',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/oster-black-logo.png`,
      width: 610,
      height: 767,
    },
    image: `${siteUrl}/oster-black-logo.png`,
    sameAs: [
      'https://www.facebook.com/ostersIF',
      'https://x.com/OstersIF',
      'https://www.instagram.com/ostersif/',
      'https://www.tiktok.com/@ostersif',
    ],
    sport: 'Football',
    memberOf: {
      '@type': 'SportsOrganization',
      name: 'Svenska Fotbollförbundet',
      alternateName: 'SvFF',
    },
    foundingDate: '1930',
    foundingLocation: {
      '@type': 'Place',
      name: 'Växjö, Sweden',
    },
    location: {
      '@type': 'Place',
      name: 'Myresjöhus Arena',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Arenagatan 11',
        addressLocality: 'Växjö',
        postalCode: '352 46',
        addressCountry: 'SE',
      },
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Swedish', 'English'],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
    />
  )
}

/**
 * WebSite schema with search action
 */
export function WebSiteJsonLd() {
  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: 'Östers IF',
    description: 'Officiell webbplats för Östers IF - en av Sveriges mest traditionsrika fotbollsföreningar',
    url: siteUrl,
    publisher: {
      '@id': `${siteUrl}/#organization`,
    },
    inLanguage: 'sv-SE',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/nyheter?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
    />
  )
}

/**
 * Combined JSON-LD component for root layout
 */
export function SiteJsonLd() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
    </>
  )
}

/**
 * NewsArticle JSON-LD for individual news articles
 */
export function NewsArticleJsonLd({
  headline,
  description,
  url,
  imageUrl,
  publishedTime,
  modifiedTime,
  categories,
}: {
  headline: string
  description: string
  url: string
  imageUrl?: string | null
  publishedTime?: string
  modifiedTime?: string
  categories?: string[]
}) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    description,
    url: `${siteUrl}${url}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}${url}`,
    },
    ...(imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
      },
    }),
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    author: {
      '@type': 'Organization',
      name: 'Östers IF',
      '@id': `${siteUrl}/#organization`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Östers IF',
      '@id': `${siteUrl}/#organization`,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/oster-black-logo.png`,
      },
    },
    inLanguage: 'sv-SE',
    ...(categories && categories.length > 0 && {
      articleSection: categories[0],
      keywords: categories.join(', '),
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
    />
  )
}

/**
 * BreadcrumbList JSON-LD
 */
export function BreadcrumbListJsonLd({
  items,
}: {
  items: { name: string; url: string }[]
}) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
  )
}
