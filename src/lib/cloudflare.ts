/**
 * Cloudflare DNS verification helper
 *
 * This module provides functions to verify custom domains using Cloudflare's DNS API
 */

interface CloudflareDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface CloudflareResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: CloudflareDNSRecord[];
}

/**
 * Verify a TXT record exists for a domain using Cloudflare's DNS API
 */
export async function verifyTxtRecord(
  domain: string,
  expectedValue: string
): Promise<{ verified: boolean; error?: string }> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    return {
      verified: false,
      error: 'Cloudflare API credentials not configured',
    };
  }

  try {
    // Extract the root domain from the full domain
    // e.g., support.example.com -> example.com
    const parts = domain.split('.');
    const rootDomain = parts.slice(-2).join('.');

    // Get zone ID for the domain
    const zoneId = await getZoneId(rootDomain, apiToken);
    if (!zoneId) {
      return {
        verified: false,
        error: 'Domain zone not found in Cloudflare',
      };
    }

    // Look up TXT records for the verification subdomain
    const verificationDomain = `_linear-verification.${domain}`;
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${verificationDomain}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return {
        verified: false,
        error: 'Failed to query Cloudflare DNS API',
      };
    }

    const data = (await response.json()) as CloudflareResponse;

    if (!data.success) {
      return {
        verified: false,
        error: data.errors?.[0]?.message || 'Cloudflare API error',
      };
    }

    // Check if any TXT record matches our expected value
    const verified = data.result.some(
      (record) => record.content === expectedValue
    );

    if (!verified) {
      return {
        verified: false,
        error: 'TXT record not found or value does not match',
      };
    }

    return { verified: true };
  } catch (error) {
    console.error('Error verifying TXT record:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify a CNAME record exists for a domain
 */
export async function verifyCnameRecord(
  domain: string,
  expectedTarget: string
): Promise<{ verified: boolean; error?: string }> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!apiToken) {
    return {
      verified: false,
      error: 'Cloudflare API credentials not configured',
    };
  }

  try {
    // Extract the root domain
    const parts = domain.split('.');
    const rootDomain = parts.slice(-2).join('.');

    const zoneId = await getZoneId(rootDomain, apiToken);
    if (!zoneId) {
      return {
        verified: false,
        error: 'Domain zone not found in Cloudflare',
      };
    }

    // Look up CNAME records
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=CNAME&name=${domain}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return {
        verified: false,
        error: 'Failed to query Cloudflare DNS API',
      };
    }

    const data = (await response.json()) as CloudflareResponse;

    if (!data.success) {
      return {
        verified: false,
        error: data.errors?.[0]?.message || 'Cloudflare API error',
      };
    }

    // Check if CNAME points to our domain
    const verified = data.result.some(
      (record) =>
        record.content === expectedTarget ||
        record.content === `${expectedTarget}.`
    );

    if (!verified) {
      return {
        verified: false,
        error: 'CNAME record not found or does not point to the correct target',
      };
    }

    return { verified: true };
  } catch (error) {
    console.error('Error verifying CNAME record:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Cloudflare Zone ID for a domain
 */
async function getZoneId(
  domain: string,
  apiToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${domain}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as CloudflareResponse & {
      result: Array<{ id: string; name: string }>;
    };

    if (!data.success || data.result.length === 0) {
      return null;
    }

    return data.result[0].id;
  } catch (error) {
    console.error('Error getting zone ID:', error);
    return null;
  }
}

/**
 * Check if SSL certificate is active for a domain on Cloudflare
 */
export async function checkSslStatus(
  domain: string
): Promise<{ active: boolean; error?: string }> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!apiToken) {
    return {
      active: false,
      error: 'Cloudflare API credentials not configured',
    };
  }

  try {
    // For Cloudflare-hosted domains, SSL is typically automatic
    // We can check the zone's SSL settings
    const parts = domain.split('.');
    const rootDomain = parts.slice(-2).join('.');

    const zoneId = await getZoneId(rootDomain, apiToken);
    if (!zoneId) {
      return {
        active: false,
        error: 'Domain zone not found',
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/ssl`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return {
        active: false,
        error: 'Failed to check SSL status',
      };
    }

    const data = (await response.json()) as CloudflareResponse & {
      result: { value: string };
    };

    if (!data.success) {
      return {
        active: false,
        error: data.errors?.[0]?.message || 'Cloudflare API error',
      };
    }

    // SSL is active if it's set to flexible, full, or strict
    const sslActive = ['flexible', 'full', 'strict'].includes(
      data.result.value
    );

    return { active: sslActive };
  } catch (error) {
    console.error('Error checking SSL status:', error);
    return {
      active: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify both CNAME and TXT records for a custom domain
 */
export async function verifyCustomDomain(
  domain: string,
  verificationToken: string,
  targetDomain: string
): Promise<{
  success: boolean;
  cnameVerified: boolean;
  txtVerified: boolean;
  sslActive: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Verify CNAME record
  const cnameResult = await verifyCnameRecord(domain, targetDomain);
  if (!cnameResult.verified && cnameResult.error) {
    errors.push(`CNAME: ${cnameResult.error}`);
  }

  // Verify TXT record
  const txtResult = await verifyTxtRecord(domain, verificationToken);
  if (!txtResult.verified && txtResult.error) {
    errors.push(`TXT: ${txtResult.error}`);
  }

  // Check SSL status
  const sslResult = await checkSslStatus(domain);
  if (!sslResult.active && sslResult.error) {
    errors.push(`SSL: ${sslResult.error}`);
  }

  const success = cnameResult.verified && txtResult.verified;

  return {
    success,
    cnameVerified: cnameResult.verified,
    txtVerified: txtResult.verified,
    sslActive: sslResult.active,
    errors,
  };
}
