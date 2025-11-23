# Cloudflare custom domains setup guide

This guide explains how to set up Cloudflare for custom domain verification and management in your Linear integrations app.

## Prerequisites

- A Cloudflare account
- Your domain added to Cloudflare (nameservers pointing to Cloudflare)
- The app deployed to Cloudflare Pages or another Cloudflare service

## Step 1: Create a Cloudflare API token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Choose "Create Custom Token"
4. Configure the token with these permissions:
   - **Zone → DNS → Read** (to verify DNS records)
   - **Zone → SSL and Certificates → Read** (to check SSL status)
5. Set the zone resources to "All zones" or specific zones you want to support
6. Create the token and save it securely

## Step 2: Get your Cloudflare account ID

1. Go to your [Cloudflare dashboard](https://dash.cloudflare.com)
2. Select any domain
3. Scroll down on the overview page
4. Copy your **Account ID** from the right sidebar

## Step 3: Configure environment variables

Add these variables to your `.env` file:

```bash
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
NEXT_PUBLIC_APP_DOMAIN=linear.gratis  # or your custom domain
```

## Step 4: Deploy to Cloudflare

Make sure to add these environment variables to your Cloudflare Pages deployment:

1. Go to your Cloudflare Pages project
2. Navigate to Settings → Environment Variables
3. Add the three variables above
4. Redeploy your application

## How custom domains work

### User workflow:
1. User adds a custom domain (e.g., `support.example.com`) in your app
2. App generates:
   - A verification token (e.g., `linear-verify-abc123`)
   - DNS record instructions
3. User adds these records to their domain:
   - **CNAME**: `support.example.com` → `linear.gratis`
   - **TXT**: `_linear-verification.support.example.com` → `linear-verify-abc123`
4. User clicks "Verify" in your app
5. App uses Cloudflare API to check:
   - ✅ CNAME record points to your app domain
   - ✅ TXT record contains the correct verification token
   - ✅ SSL certificate is active (automatic with Cloudflare)
6. Domain is verified and active

### Technical flow:
```
User Request → Middleware → Domain Lookup → Route to Form/View
              ↓
          Cloudflare DNS
          ↓
      Your App Domain
```

## Cloudflare DNS API verification process

The app uses Cloudflare's DNS API to verify domain ownership:

### 1. CNAME verification
```bash
GET /zones/{zone_id}/dns_records?type=CNAME&name={domain}
```
Checks if the CNAME record points to your app domain.

### 2. TXT record verification
```bash
GET /zones/{zone_id}/dns_records?type=TXT&name=_linear-verification.{domain}
```
Checks if the TXT record contains the correct verification token.

### 3. SSL status check
```bash
GET /zones/{zone_id}/settings/ssl
```
Verifies that SSL is configured (flexible, full, or strict).

## SSL certificate provisioning

When using Cloudflare:
- SSL certificates are **automatically provisioned** for all domains
- No manual certificate management needed
- Certificates auto-renew
- Users get HTTPS immediately upon verification

## Security considerations

### API token security
- ✅ Use a scoped API token (not your Global API key)
- ✅ Only grant read permissions (Zone:DNS:Read, Zone:SSL:Read)
- ✅ Store tokens in environment variables, never in code
- ✅ Rotate tokens periodically

### Domain verification
- ✅ Always verify TXT record before allowing domain use
- ✅ Re-verify domains periodically (e.g., every 30 days)
- ✅ Disable domains if verification fails

### Rate limiting
Cloudflare's API has rate limits:
- **1,200 requests per 5 minutes** (standard)
- Implement caching for domain lookups
- Batch verification checks when possible

## Troubleshooting

### "Zone not found" error
- Ensure the domain is added to your Cloudflare account
- Check that your API token has access to the zone
- Verify CLOUDFLARE_ACCOUNT_ID is correct

### DNS records not found
- Wait 1-2 minutes after adding DNS records (propagation time)
- Check that records are added to the correct zone
- Verify there are no typos in the domain name

### SSL not active
- Check SSL mode in Cloudflare (should be Flexible, Full, or Strict)
- Wait a few minutes for SSL to provision
- Ensure the domain's DNS is proxied through Cloudflare (orange cloud)

### Verification always fails
- Check your API token permissions
- Verify the token hasn't expired
- Check Cloudflare API status: https://www.cloudflarestatus.com/

## Alternative: Cloudflare for SaaS (Enterprise)

If you're on Cloudflare Enterprise, you can use [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/) which provides:
- Custom hostname API
- Automatic SSL provisioning API
- Better rate limits
- Programmatic certificate management

To use Cloudflare for SaaS, you'd replace the DNS verification with:

```typescript
// Create custom hostname
POST /zones/{zone_id}/custom_hostnames
{
  "hostname": "support.example.com",
  "ssl": {
    "method": "http",
    "type": "dv"
  }
}
```

This approach doesn't require users to add TXT records and handles SSL automatically.

## Monitoring

Consider setting up monitoring for:
- Failed domain verifications
- SSL certificate issues
- Cloudflare API errors
- Domain verification queue length

You can use Cloudflare's Analytics API or set up custom logging in your verification endpoints.

## Cost considerations

- **DNS API usage**: Free for most use cases
- **SSL certificates**: Included with all Cloudflare plans
- **Cloudflare for SaaS**: Enterprise feature (contact Cloudflare sales)
- **API rate limits**: 1,200 requests per 5 minutes (standard)

## Next steps

After setup is complete, test the full flow:
1. Add a test custom domain
2. Configure DNS records
3. Verify the domain
4. Access your form/view via the custom domain
5. Check SSL certificate is active
6. Test domain deactivation/deletion

For more information, see:
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [DNS Records API](https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-list-dns-records)
- [SSL/TLS Settings](https://developers.cloudflare.com/ssl/)
