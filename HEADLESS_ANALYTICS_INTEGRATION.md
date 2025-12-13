# Headless Frontend Analytics Integration

This guide explains how to integrate Umami analytics into your headless Next.js frontend. The tracking is server-side for maximum accuracy (bypasses ad blockers, works without JavaScript).

## Overview

```
Visitor → Your Headless Frontend → POST to CMS API → Umami Server
                                   (server-side)
```

**Benefits of server-side tracking:**
- 100% accurate (no ad blocker interference)
- Works even if client JS fails
- No cookies, GDPR-compliant without consent banner

---

## Setup

### 1. Environment Variables

Add to your headless frontend's `.env`:

```env
CMS_API_URL=https://app.frontspace.se
```

### 2. Get Store's Website ID

When fetching store data from the CMS, include the `umami_website_id` field:

```typescript
// Example: fetching store config
const store = await fetch(`${CMS_API_URL}/api/stores/${storeId}`).then(r => r.json())
// store.umami_website_id contains the Umami website ID
```

---

## Server-Side Tracking (Recommended)

### Option A: Middleware Tracking (Best)

Track every page view automatically via Next.js middleware:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Don't track static assets, API routes, etc.
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return response
  }

  // Track page view (non-blocking)
  trackPageView(request).catch(() => {})

  return response
}

async function trackPageView(request: NextRequest) {
  const websiteId = process.env.UMAMI_WEBSITE_ID // or fetch from store config

  if (!websiteId) return

  await fetch(`${process.env.CMS_API_URL}/api/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'event',
      payload: {
        website: websiteId,
        url: request.nextUrl.pathname + request.nextUrl.search,
        hostname: request.nextUrl.hostname,
        referrer: request.headers.get('referer') || '',
        language: request.headers.get('accept-language')?.split(',')[0] || '',
        // User agent for device detection
        ua: request.headers.get('user-agent') || '',
      },
    }),
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Option B: Server Component Tracking

Track in your root layout (server component):

```typescript
// app/layout.tsx
import { headers } from 'next/headers'

async function trackPageView(pathname: string) {
  const headersList = headers()
  const websiteId = process.env.UMAMI_WEBSITE_ID

  if (!websiteId) return

  try {
    await fetch(`${process.env.CMS_API_URL}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: websiteId,
          url: pathname,
          hostname: headersList.get('host') || '',
          referrer: headersList.get('referer') || '',
          language: headersList.get('accept-language')?.split(',')[0] || '',
          ua: headersList.get('user-agent') || '',
        },
      }),
    })
  } catch (e) {
    // Silent fail - don't break the page
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Note: This tracks on every render, you may want to dedupe
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

---

## Client-Side Tracking (Alternative)

If you need client-side data (screen size), use this component:

```typescript
// components/analytics-tracker.tsx
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface AnalyticsTrackerProps {
  websiteId: string
  cmsApiUrl: string
}

export function AnalyticsTracker({ websiteId, cmsApiUrl }: AnalyticsTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!websiteId) return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

    fetch(`${cmsApiUrl}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: websiteId,
          url,
          hostname: window.location.hostname,
          referrer: document.referrer,
          language: navigator.language,
          screen: `${screen.width}x${screen.height}`,
        },
      }),
    }).catch(() => {})
  }, [pathname, searchParams, websiteId, cmsApiUrl])

  return null
}
```

Usage in layout:

```typescript
// app/layout.tsx
import { AnalyticsTracker } from '@/components/analytics-tracker'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsTracker
          websiteId={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID!}
          cmsApiUrl={process.env.NEXT_PUBLIC_CMS_API_URL!}
        />
        {children}
      </body>
    </html>
  )
}
```

---

## Tracking Custom Events

Track button clicks, form submissions, etc:

```typescript
// lib/analytics.ts
export async function trackEvent(
  websiteId: string,
  eventName: string,
  eventData?: Record<string, string | number>
) {
  await fetch(`${process.env.CMS_API_URL}/api/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'event',
      payload: {
        website: websiteId,
        url: window.location.pathname,
        hostname: window.location.hostname,
        name: eventName,
        data: eventData,
      },
    }),
  }).catch(() => {})
}

// Usage
await trackEvent(websiteId, 'purchase', { value: 299, currency: 'SEK' })
await trackEvent(websiteId, 'signup')
await trackEvent(websiteId, 'add_to_cart', { product_id: '123' })
```

---

## API Reference

### POST /api/analytics

Proxies tracking data to Umami.

**Request Body:**

```json
{
  "type": "event",
  "payload": {
    "website": "uuid-of-umami-website",
    "url": "/products/123",
    "hostname": "example.com",
    "referrer": "https://google.com",
    "language": "sv-SE",
    "screen": "1920x1080",
    "name": "optional_event_name",
    "data": { "optional": "event_data" }
  }
}
```

**Response:** `{ "success": true }`

---

## Privacy & GDPR

Umami is cookieless and GDPR-compliant:
- No cookies set
- No personal data stored
- IP addresses are NOT stored
- Visitor identification uses daily-rotating hashes

**No consent banner required** for Umami tracking alone.

---

## Troubleshooting

### Tracking not working?

1. Check `UMAMI_WEBSITE_ID` is set correctly
2. Check `CMS_API_URL` is accessible from your server
3. Check browser network tab for `/api/analytics` requests
4. Check CMS logs for errors

### Data not showing in admin?

1. Analytics can take a few minutes to appear
2. Verify the website ID matches the store's `umami_website_id`
3. Check the date range in the analytics dashboard
