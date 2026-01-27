/**
 * JSON-LD Structured Data Components
 *
 * Provides Schema.org structured data for SEO
 * Includes Organization and WebSite schemas for Östers IF
 */

/**
 * Organization schema for Östers IF (SportsOrganization)
 */
export function OrganizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://ostersif.se'

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    '@id': `${siteUrl}/#organization`,
    name: 'Östers IF',
    alternateName: 'Östers Idrottsförening',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/oif_emblem_rgb.png`,
      width: 200,
      height: 200,
    },
    sameAs: [
      'https://www.facebook.com/ostersIF',
      'https://twitter.com/OstersIF',
      'https://www.instagram.com/ostersif/',
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
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://ostersif.se'

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
 * Includes both Organization and WebSite schemas
 */
export function SiteJsonLd() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
    </>
  )
}
