/**
 * Track custom events to Umami analytics via local API proxy
 * Uses sendBeacon for non-blocking, navigation-safe analytics
 */
export function trackEvent(
  eventName: string,
  eventData?: Record<string, string | number>
) {
  const storeId = process.env.NEXT_PUBLIC_FRONTSPACE_STORE_ID

  if (!storeId || typeof window === 'undefined') return

  const payload = JSON.stringify({
    storeId,
    type: 'event',
    payload: {
      url: window.location.pathname,
      hostname: window.location.hostname,
      name: eventName,
      data: eventData,
    },
  })

  // Use sendBeacon (non-blocking, survives navigation)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', payload)
  } else {
    // Fallback for older browsers
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}
