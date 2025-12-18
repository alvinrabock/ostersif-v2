# Webhook Debugging Guide (Coolify Deployment)

## Problem
Webhooks work locally but not on production (Coolify). Content updates in Frontspace CMS don't appear on the frontend.

## KNOWN ISSUE: Only New Posts Trigger Revalidation

**Symptom:** Creating new posts works, but updating or deleting existing posts doesn't trigger revalidation.

**Cause:** Frontspace CMS webhook is only configured to fire on `post.created` events.

**Solution:** In Frontspace CMS admin, configure the webhook to trigger on ALL post events:
- ✅ `post.created` - when a new post is published
- ❌ `post.updated` - when an existing post is modified (ENABLE THIS)
- ❌ `post.deleted` - when a post is deleted (ENABLE THIS)

Same applies for pages:
- `page.created`
- `page.updated`
- `page.deleted`

## Quick Diagnosis

### 1. Verify Webhook URL in Frontspace CMS
- Go to Frontspace admin → Webhooks settings
- Confirm the webhook URL is: `https://ostersif.se/api/webhooks/frontspace`
- OR the main endpoint: `https://ostersif.se/api/frontspace/webhook`

### 2. Check Environment Variables in Coolify
Make sure these are set in Coolify's environment variables (not just locally):

```
FRONTSPACE_WEBHOOK_SECRET=your_webhook_secret_here
FRONTSPACE_STORE_ID=ce4dbf16-d9f8-4b23-9c5d-1209049a3e6e
FRONTSPACE_API_KEY=your_api_key
FRONTSPACE_ENDPOINT=https://app.frontspace.se/api/graphql
```

**IMPORTANT**: The `FRONTSPACE_WEBHOOK_SECRET` must match EXACTLY between:
- Frontspace CMS webhook configuration
- Coolify environment variables

### 3. Test Webhook Endpoint Manually

From your terminal, test if the endpoint is reachable:

```bash
# Test GET (should return JSON response)
curl -I https://ostersif.se/api/frontspace/webhook

# Test with secret for manual revalidation
curl "https://ostersif.se/api/frontspace/webhook?secret=YOUR_SECRET&test=nyheter"
```

Expected response:
```json
{
  "message": "Test revalidation complete",
  "revalidatedTags": ["frontspace", "nyheter", ...],
  "timestamp": "..."
}
```

### 4. Check Coolify Logs

In Coolify dashboard:
1. Go to your application
2. Click "Logs" or "Runtime Logs"
3. Look for webhook-related logs:
   - `[Webhook] POST request received`
   - `🔔 Webhook received: event=...`
   - `❌ Webhook error:` (if there's an error)

### 5. Test Webhook Signature

If you see "Invalid signature" errors, the secret doesn't match.

To debug signature issues, temporarily modify `route.ts` to log more info:

```typescript
// In src/app/api/frontspace/webhook/route.ts
// Add this after line 20 for debugging:
console.log('[Webhook] Headers:', {
  signature: receivedSignature,
  hasSecret: !!WEBHOOK_SECRET,
});
```

### 6. Common Issues & Solutions

#### Issue: "Invalid signature" error
**Cause**: HMAC signature mismatch
**Solution**:
1. Re-copy the webhook secret from Frontspace CMS
2. Paste it EXACTLY in Coolify env vars (no extra spaces)
3. Redeploy the application

#### Issue: 404 Not Found
**Cause**: Route not deployed or wrong URL
**Solution**:
1. Verify build completed successfully
2. Check if `/api/frontspace/webhook` exists in the build
3. Try the alias: `/api/webhooks/frontspace`

#### Issue: 500 Internal Server Error
**Cause**: Server-side error during processing
**Solution**:
1. Check Coolify logs for stack trace
2. Common cause: Missing environment variables

#### Issue: Webhook "delivered" but nothing happens
**Cause**: Webhook reaches server but revalidation doesn't work
**Solution**:
1. Check if `revalidateTag` is being called (add logging)
2. Verify Next.js is running in production mode (`next start`)
3. Check if ISR/caching is properly configured

### 7. Coolify-Specific Checks

#### Check Docker Container Logs
```bash
# SSH into your Coolify server
docker logs <container_name> --tail 100 -f
```

#### Verify Build Output
Make sure the build includes the API routes:
```bash
# In the container or build output, check for:
.next/server/app/api/frontspace/webhook/route.js
```

#### Network/Firewall
- Ensure Coolify allows incoming POST requests to `/api/*`
- Check if there's a reverse proxy (Traefik/Nginx) blocking webhooks
- Verify SSL certificate is valid (webhooks require HTTPS)

### 8. Manual Revalidation Workaround

While debugging, you can manually trigger revalidation:

```bash
# Replace YOUR_SECRET with your actual webhook secret
curl "https://ostersif.se/api/frontspace/webhook?secret=YOUR_SECRET&test=all"
```

Or add a revalidation button in your CMS that calls this endpoint.

### 9. Debugging Checklist

- [ ] Webhook URL in Frontspace CMS is correct
- [ ] `FRONTSPACE_WEBHOOK_SECRET` is set in Coolify
- [ ] Secret matches between CMS and Coolify
- [ ] Application was redeployed after adding env vars
- [ ] API route is accessible (GET returns 200)
- [ ] Coolify logs show webhook requests
- [ ] No firewall/proxy blocking POST requests
- [ ] SSL certificate is valid

### 10. Testing Flow

1. **Before publishing**: Check Coolify logs in real-time
2. **Publish content** in Frontspace CMS
3. **Watch logs** for `[Webhook] POST request received`
4. If no log appears → webhook isn't reaching server (network/URL issue)
5. If log appears but error → check the error message
6. If success log but no update → ISR/cache configuration issue

## Contact Points

- **Frontspace CMS webhook logs**: Check in Frontspace admin panel
- **Coolify logs**: Dashboard → Application → Logs
- **Server logs**: SSH into Coolify server, check Docker container logs
