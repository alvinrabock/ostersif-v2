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
STORE_ID=your-store-uuid-here
```

**Note:** You only need the Store ID - the CMS automatically looks up the Umami website ID.

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
  const storeId = process.env.STORE_ID

  if (!storeId) return

  await fetch(`${process.env.CMS_API_URL}/api/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId, // CMS looks up the Umami website ID automatically
      type: 'event',
      payload: {
        url: request.nextUrl.pathname + request.nextUrl.search,
        hostname: request.nextUrl.hostname,
        referrer: request.headers.get('referer') || '',
        language: request.headers.get('accept-language')?.split(',')[0] || '',
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
  const storeId = process.env.STORE_ID

  if (!storeId) return

  try {
    await fetch(`${process.env.CMS_API_URL}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        type: 'event',
        payload: {
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
  storeId: string
  cmsApiUrl: string
}

export function AnalyticsTracker({ storeId, cmsApiUrl }: AnalyticsTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!storeId) return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

    fetch(`${cmsApiUrl}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        type: 'event',
        payload: {
          url,
          hostname: window.location.hostname,
          referrer: document.referrer,
          language: navigator.language,
          screen: `${screen.width}x${screen.height}`,
        },
      }),
    }).catch(() => {})
  }, [pathname, searchParams, storeId, cmsApiUrl])

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
          storeId={process.env.NEXT_PUBLIC_STORE_ID!}
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
  storeId: string,
  eventName: string,
  eventData?: Record<string, string | number>
) {
  await fetch(`${process.env.CMS_API_URL}/api/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId,
      type: 'event',
      payload: {
        url: window.location.pathname,
        hostname: window.location.hostname,
        name: eventName,
        data: eventData,
      },
    }),
  }).catch(() => {})
}

// Usage
const storeId = process.env.NEXT_PUBLIC_STORE_ID!
await trackEvent(storeId, 'purchase', { value: 299, currency: 'SEK' })
await trackEvent(storeId, 'signup')
await trackEvent(storeId, 'add_to_cart', { product_id: '123' })
```

---

## API Reference

### POST /api/analytics

Proxies tracking data to Umami. Automatically looks up Umami website ID from store ID.

**Request Body:**

```json
{
  "storeId": "your-store-uuid",
  "type": "event",
  "payload": {
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

**Note:** The CMS caches the store → Umami website ID mapping for 5 minutes for performance.

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

1. Check `STORE_ID` is set correctly in `.env`
2. Check `CMS_API_URL` is accessible from your server
3. Check browser network tab for `/api/analytics` requests
4. Check CMS logs for errors

### Data not showing in admin?

1. Analytics can take a few minutes to appear
2. Verify the store has `umami_website_id` set (check store settings in CMS)
3. Check the date range in the analytics dashboard
