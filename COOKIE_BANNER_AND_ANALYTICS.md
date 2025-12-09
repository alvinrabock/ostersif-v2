# Cookie Banner & Analytics Implementation Guide

This guide covers how to implement the Frontspace cookie consent banner and analytics tracking system for both standard and headless storefronts.

---

## Table of Contents

1. [Overview](#overview)
2. [Standard Implementation (Built-in)](#standard-implementation-built-in)
3. [Headless Implementation](#headless-implementation)
4. [Analytics Tracking](#analytics-tracking)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Frontspace cookie consent and analytics system consists of:

- **Cookie Banner**: GDPR-compliant consent management with Google Consent Mode V2
- **Client-side Tracking**: Browser-based page view tracking (respects consent)
- **Server-side Tracking**: Middleware-based tracking for improved accuracy
- **Public API**: For headless/custom implementations

### How It Works

```
User visits store
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Cookie Banner checks for existing consent              │
│  ├─ If no consent → Show banner                         │
│  └─ If consent exists → Apply saved preferences         │
└─────────────────────────────────────────────────────────┘
       │
       ▼ (User accepts analytics)
       │
┌─────────────────────────────────────────────────────────┐
│  Consent saved to:                                      │
│  ├─ localStorage (for client-side checks)               │
│  └─ Cookie (for server-side checks)                     │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Analytics tracked via:                                 │
│  ├─ Server-side (middleware) - automatic                │
│  └─ Client-side (beacon) - for SPA navigation           │
└─────────────────────────────────────────────────────────┘
```

---

## Standard Implementation (Built-in)

For stores hosted on Frontspace, the cookie banner and analytics are **automatically enabled** when configured in the admin panel.

### Enable Cookie Banner

1. Go to **Admin → Settings → Cookie Banner**
2. Toggle **Enable Cookie Banner**
3. Configure the following settings:

| Setting | Description |
|---------|-------------|
| Banner Title | Heading text (e.g., "Cookie Consent") |
| Banner Message | Description of cookie usage |
| Position | Where banner appears (bottom, bottom-left, etc.) |
| Colors | Primary and text colors |
| Categories | Enable/disable: Necessary, Analytics, Marketing, Preferences |

### Enable Analytics

1. Go to **Admin → Settings → Analytics** (or it's auto-enabled)
2. Analytics will start collecting data when users accept the analytics cookie category

### View Analytics

Go to **Admin → Analytics** to see:
- Page views and unique visitors
- Device breakdown (desktop/mobile/tablet)
- Top pages
- Traffic sources
- Geographic data

---

## Headless Implementation

For custom storefronts or headless implementations, use the embed scripts.

### Step 1: Add Cookie Banner Script

Add this script to your `<head>` tag:

```html
<script
  src="https://app.frontspace.se/embed/frontspace-consent.js"
  data-store-id="YOUR_STORE_ID"
  data-api-base="https://app.frontspace.se">
</script>
```

**Or auto-detect by domain** (if your domain is mapped to a store):

```html
<script
  src="https://app.frontspace.se/embed/frontspace-consent.js"
  data-api-base="https://app.frontspace.se">
</script>
```

### Step 2: Add Analytics Tracking Script

Add this script to your `<head>` tag (after the consent script):

```html
<script
  src="https://app.frontspace.se/embed/frontspace-track.js"
  data-store-id="YOUR_STORE_ID">
</script>
```

### Script Attributes

#### Cookie Banner (`frontspace-consent.js`)

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-store-id` | No* | Your store's UUID |
| `data-api-base` | Yes | API base URL (e.g., `https://app.frontspace.se`) |

*If omitted, store is detected from the current domain.

#### Analytics Tracker (`frontspace-track.js`)

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-store-id` | Yes | Your store's UUID |
| `data-endpoint` | No | Custom tracking endpoint (defaults to `/api/public/track`) |
| `data-auto-track` | No | Set to `false` to disable automatic tracking |
| `data-debug` | No | Set to `true` for console logging |

### JavaScript API

Both scripts expose APIs for programmatic control:

#### FrontspaceConsent API

```javascript
// Check if a category is consented
FrontspaceConsent.hasConsent('analytics')  // returns boolean
FrontspaceConsent.hasConsent('marketing')

// Get all consent categories
FrontspaceConsent.getCategories()
// Returns: { necessary: true, analytics: true, marketing: false, preferences: false }

// Show the banner programmatically
FrontspaceConsent.showBanner()

// Revoke all consent (shows banner again)
FrontspaceConsent.revokeConsent()
```

#### FrontspaceTrack API

```javascript
// Initialize manually (if data-auto-track="false")
FrontspaceTrack.init({
  storeId: 'your-store-id',
  autoTrack: true,
  debug: false
})

// Track a page view manually
FrontspaceTrack.trackPageView('/custom-path', 'Page Title')

// Check if analytics consent is given
FrontspaceTrack.hasConsent()  // returns boolean
```

### Listen for Consent Events

```javascript
// Fires when user updates their consent
window.addEventListener('cookieConsentUpdated', (event) => {
  const { categories, storeId } = event.detail

  if (categories.analytics) {
    // User accepted analytics - initialize your tracking
    console.log('Analytics enabled')
  }

  if (categories.marketing) {
    // User accepted marketing - load marketing pixels
    console.log('Marketing enabled')
  }
})
```

---

## Analytics Tracking

### Automatic Tracking (Recommended)

When using the standard implementation or embed scripts, tracking happens automatically:

1. **Server-side**: Every page request is tracked in the middleware (if consent cookie exists)
2. **Client-side**: SPA navigations are tracked via the tracking script

### Manual Tracking via API

For complete control, use the public tracking API:

#### POST /api/public/track

```javascript
fetch('https://app.frontspace.se/api/public/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storeId: 'your-store-id',
    path: '/products/cool-item',
    title: 'Cool Item - My Store',
    consentGiven: true,  // Must be true to track
    referrer: document.referrer  // Optional
  })
})
```

#### GET /api/public/track (Pixel Tracking)

For simple implementations or email tracking:

```html
<img src="https://app.frontspace.se/api/public/track?sid=STORE_ID&p=/page&c=1&t=Page%20Title" />
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `sid` | Yes | Store ID |
| `p` | No | Page path (defaults to `/`) |
| `c` | Yes | Consent given (`1` = yes, `0` = no) |
| `t` | No | Page title (URL encoded) |

---

## API Reference

### Cookie Settings API

Fetch cookie banner settings for a store:

```
GET /api/embed/cookie-settings?storeId=YOUR_STORE_ID
GET /api/embed/cookie-settings?domain=your-domain.com
```

Response:
```json
{
  "storeId": "uuid",
  "settings": {
    "enabled": true,
    "banner_title": "Cookie Consent",
    "banner_message": "We use cookies...",
    "position": "bottom",
    "primary_color": "#1a1a1a",
    "text_color": "#ffffff",
    "categories": {
      "necessary": { "enabled": true, "required": true, "title": "Necessary", "description": "..." },
      "analytics": { "enabled": true, "required": false, "title": "Analytics", "description": "..." },
      "marketing": { "enabled": true, "required": false, "title": "Marketing", "description": "..." },
      "preferences": { "enabled": false, "required": false, "title": "Preferences", "description": "..." }
    }
  }
}
```

### Analytics API

Fetch analytics data for your store (requires authentication):

```
GET /api/analytics?storeId=YOUR_STORE_ID&startDate=2024-01-01&endDate=2024-01-31
```

---

## Data Collected

The analytics system collects the following (privacy-safe) data:

| Data | How It's Used |
|------|---------------|
| Page path | Identify which pages are viewed |
| Page title | Display in analytics dashboard |
| Device type | Desktop/Mobile/Tablet breakdown |
| Browser | Browser usage statistics |
| Referrer domain | Traffic source analysis |
| Country | Geographic distribution (from Accept-Language header) |
| Visitor hash | Daily rotating hash for unique visitor counting (not trackable across days) |

**Not collected:**
- Personal information
- IP addresses (only used for hashing, never stored)
- Cross-site tracking
- Persistent user identifiers

---

## Google Consent Mode V2

The cookie banner automatically integrates with Google Consent Mode V2:

```javascript
// Default state (before consent)
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied'
})

// After user accepts analytics
gtag('consent', 'update', {
  'analytics_storage': 'granted'  // Only if analytics category accepted
})

// After user accepts marketing
gtag('consent', 'update', {
  'ad_storage': 'granted',
  'ad_user_data': 'granted',
  'ad_personalization': 'granted'
})
```

---

## Troubleshooting

### Banner Not Showing

1. Check that cookie banner is **enabled** in admin settings
2. Verify the `data-store-id` is correct
3. Check browser console for errors
4. Ensure the API base URL is accessible (CORS)

### Analytics Not Recording

1. Verify user has **accepted analytics cookies**
2. Check that the consent cookie exists: `cookie_consent_{storeId}`
3. For headless: ensure `consentGiven: true` is passed to the API
4. Check the database has the `page_analytics` table

### Check Consent Status

```javascript
// In browser console
localStorage.getItem('cookie_consent_YOUR_STORE_ID')

// Or check cookie
document.cookie.split(';').find(c => c.includes('cookie_consent_'))
```

### Debug Mode

Enable debug logging:

```html
<script
  src="https://app.frontspace.se/embed/frontspace-track.js"
  data-store-id="YOUR_STORE_ID"
  data-debug="true">
</script>
```

---

## Complete Headless Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>

  <!-- Cookie Consent Banner -->
  <script
    src="https://app.frontspace.se/embed/frontspace-consent.js"
    data-store-id="your-store-id"
    data-api-base="https://app.frontspace.se">
  </script>

  <!-- Analytics Tracking -->
  <script
    src="https://app.frontspace.se/embed/frontspace-track.js"
    data-store-id="your-store-id">
  </script>

  <!-- Your other scripts -->
  <script>
    // Listen for consent changes
    window.addEventListener('cookieConsentUpdated', (e) => {
      if (e.detail.categories.marketing) {
        // Load Facebook Pixel, Google Ads, etc.
        loadMarketingPixels()
      }
    })
  </script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

---

## Support

For issues or questions:
- Check the [Frontspace Documentation](https://docs.frontspace.se)
- Contact support at support@frontspace.se
