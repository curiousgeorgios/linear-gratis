/**
 * DNS verification helper using DNS over HTTPS (DoH)
 *
 * This module provides functions to verify custom domains using public DoH APIs.
 * Works with any DNS provider (Cloudflare, Route53, Google Domains, etc.)
 */

// DNS record type numbers for DoH queries
const DNS_RECORD_TYPES = {
  A: 1,
  CNAME: 5,
  TXT: 16,
  AAAA: 28,
} as const;

interface DoHAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DoHResponse {
  Status: number; // 0 = NOERROR, 3 = NXDOMAIN
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{
    name: string;
    type: number;
  }>;
  Answer?: DoHAnswer[];
  Authority?: DoHAnswer[];
}

interface DnsLookupResult {
  success: boolean;
  records: string[];
  error?: string;
}

/**
 * Perform a DNS lookup using DNS over HTTPS
 * Primary: Cloudflare DoH, Fallback: Google DoH
 */
async function dohLookup(
  name: string,
  type: 'TXT' | 'CNAME' | 'A' | 'AAAA'
): Promise<DnsLookupResult> {
  const typeNumber = DNS_RECORD_TYPES[type];
  const endpoints = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${typeNumber}`,
  ];

  let lastError: string | undefined;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (!response.ok) {
        lastError = `DoH request failed with status ${response.status}`;
        continue;
      }

      const data = (await response.json()) as DoHResponse;

      // Status 0 = NOERROR, 3 = NXDOMAIN (domain doesn't exist)
      if (data.Status === 3) {
        return {
          success: true,
          records: [],
          error: 'Domain not found (NXDOMAIN)',
        };
      }

      if (data.Status !== 0) {
        lastError = `DNS query returned status ${data.Status}`;
        continue;
      }

      // Extract records of the requested type
      const records = (data.Answer || [])
        .filter((answer) => answer.type === typeNumber)
        .map((answer) => {
          // TXT records are often quoted, strip the quotes
          if (type === 'TXT' && answer.data.startsWith('"') && answer.data.endsWith('"')) {
            return answer.data.slice(1, -1);
          }
          // CNAME records may have trailing dot, normalise
          if (type === 'CNAME' && answer.data.endsWith('.')) {
            return answer.data.slice(0, -1);
          }
          return answer.data;
        });

      return {
        success: true,
        records,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      continue;
    }
  }

  return {
    success: false,
    records: [],
    error: lastError || 'All DNS lookup endpoints failed',
  };
}

/**
 * Verify a TXT record exists for a domain
 */
export async function verifyTxtRecord(
  domain: string,
  expectedValue: string
): Promise<{ verified: boolean; error?: string; foundValues?: string[] }> {
  try {
    // Look up TXT records for the verification subdomain
    const verificationDomain = `_linear-verification.${domain}`;
    const result = await dohLookup(verificationDomain, 'TXT');

    if (!result.success) {
      return {
        verified: false,
        error: result.error || 'Failed to look up DNS records',
      };
    }

    if (result.records.length === 0) {
      return {
        verified: false,
        error: `No TXT record found at ${verificationDomain}. Please add a TXT record with value: ${expectedValue}`,
        foundValues: [],
      };
    }

    // Check if any TXT record matches our expected value
    const verified = result.records.some((record) => record === expectedValue);

    if (!verified) {
      return {
        verified: false,
        error: `TXT record found but value doesn't match. Expected: ${expectedValue}, Found: ${result.records.join(', ')}`,
        foundValues: result.records,
      };
    }

    return { verified: true, foundValues: result.records };
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
): Promise<{ verified: boolean; error?: string; foundTarget?: string }> {
  try {
    const result = await dohLookup(domain, 'CNAME');

    if (!result.success) {
      return {
        verified: false,
        error: result.error || 'Failed to look up DNS records',
      };
    }

    if (result.records.length === 0) {
      return {
        verified: false,
        error: `No CNAME record found for ${domain}. Please add a CNAME record pointing to ${expectedTarget}`,
      };
    }

    // Normalise expected target (remove trailing dot if present)
    const normalisedExpected = expectedTarget.endsWith('.')
      ? expectedTarget.slice(0, -1)
      : expectedTarget;

    // Check if CNAME points to our target (case-insensitive)
    const verified = result.records.some(
      (record) => record.toLowerCase() === normalisedExpected.toLowerCase()
    );

    const foundTarget = result.records[0];

    if (!verified) {
      return {
        verified: false,
        error: `CNAME record found but points to wrong target. Expected: ${expectedTarget}, Found: ${foundTarget}`,
        foundTarget,
      };
    }

    return { verified: true, foundTarget };
  } catch (error) {
    console.error('Error verifying CNAME record:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Cloudflare for SaaS - Custom Hostnames API
// ============================================================================

/**
 * Cloudflare ownership verification TXT record
 * This is returned when creating a custom hostname and must be added to DNS
 */
export interface CloudflareOwnershipVerification {
  type: 'txt';
  name: string;
  value: string;
}

/**
 * Cloudflare HTTP ownership verification (alternative to TXT)
 */
export interface CloudflareOwnershipVerificationHttp {
  http_url: string;
  http_body: string;
}

/**
 * SSL validation record from Cloudflare
 * May include TXT, HTTP, or CNAME-based validation
 */
export interface CloudflareSslValidationRecord {
  status: string;
  method: 'http' | 'txt' | 'cname' | 'email';
  txt_name?: string;
  txt_value?: string;
  http_url?: string;
  http_body?: string;
  cname?: string;
  cname_target?: string;
}

/**
 * Full custom hostname result from Cloudflare API
 */
export interface CloudflareCustomHostnameResult {
  id: string;
  hostname: string;
  status: 'pending' | 'active' | 'pending_deletion' | 'moved' | 'deleted';
  ownership_verification?: CloudflareOwnershipVerification;
  ownership_verification_http?: CloudflareOwnershipVerificationHttp;
  ssl: {
    id?: string;
    status: 'initializing' | 'pending_validation' | 'pending_issuance' | 'pending_deployment' | 'active' | 'expired' | 'deleted';
    method: 'http' | 'txt' | 'email' | 'cname';
    type: 'dv' | 'ov' | 'ev';
    validation_records?: CloudflareSslValidationRecord[];
    validation_errors?: Array<{ message: string }>;
    settings?: {
      min_tls_version?: string;
    };
  };
  created_at: string;
}

interface CloudflareCustomHostnameResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: CloudflareCustomHostnameResult | null;
}

interface CloudflareListResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: Array<{
    id: string;
    hostname: string;
    status: string;
  }>;
}

/**
 * Result from adding a custom hostname
 */
export interface AddCustomHostnameResult {
  success: boolean;
  hostnameId?: string;
  hostnameStatus?: CloudflareCustomHostnameResult['status'];
  ownershipVerification?: CloudflareOwnershipVerification;
  ownershipVerificationHttp?: CloudflareOwnershipVerificationHttp;
  sslStatus?: CloudflareCustomHostnameResult['ssl']['status'];
  sslValidationRecords?: CloudflareSslValidationRecord[];
  error?: string;
}

/**
 * Add a custom hostname to Cloudflare for SaaS
 * This allows customer domains to route to your worker
 *
 * Returns the full Cloudflare response including ownership verification
 * and SSL validation records that users need to add to their DNS
 */
export async function addCustomHostname(hostname: string): Promise<AddCustomHostnameResult> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    return {
      success: false,
      error: 'Cloudflare API credentials not configured (need CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID)',
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostname,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              min_tls_version: '1.2',
            },
          },
        }),
      }
    );

    const data = (await response.json()) as CloudflareCustomHostnameResponse;

    if (!data.success || !data.result) {
      const errorMsg = data.errors?.[0]?.message || 'Failed to add custom hostname';
      console.error('Cloudflare custom hostname error:', data.errors);
      return {
        success: false,
        error: errorMsg,
      };
    }

    const result = data.result;
    console.log('Custom hostname added:', result.hostname, result.id, 'status:', result.status);

    return {
      success: true,
      hostnameId: result.id,
      hostnameStatus: result.status,
      ownershipVerification: result.ownership_verification,
      ownershipVerificationHttp: result.ownership_verification_http,
      sslStatus: result.ssl.status,
      sslValidationRecords: result.ssl.validation_records,
    };
  } catch (error) {
    console.error('Error adding custom hostname:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a custom hostname from Cloudflare for SaaS
 */
export async function removeCustomHostname(
  hostnameId: string
): Promise<{ success: boolean; error?: string }> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    return {
      success: false,
      error: 'Cloudflare API credentials not configured',
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${hostnameId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = (await response.json()) as { success: boolean; errors?: Array<{ message: string }> };

    if (!data.success) {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'Failed to remove custom hostname',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing custom hostname:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find a custom hostname by hostname string
 */
export async function findCustomHostname(
  hostname: string
): Promise<{ found: boolean; hostnameId?: string; error?: string }> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    return {
      found: false,
      error: 'Cloudflare API credentials not configured',
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = (await response.json()) as CloudflareListResponse;

    if (!data.success) {
      return {
        found: false,
        error: data.errors?.[0]?.message || 'Failed to search custom hostnames',
      };
    }

    const match = data.result.find((h) => h.hostname === hostname);
    if (match) {
      return { found: true, hostnameId: match.id };
    }

    return { found: false };
  } catch (error) {
    console.error('Error finding custom hostname:', error);
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Result from getting a custom hostname
 */
export interface GetCustomHostnameResult {
  success: boolean;
  hostname?: CloudflareCustomHostnameResult;
  error?: string;
}

/**
 * Get the current status of a custom hostname from Cloudflare
 * Use this to poll for verification and SSL status updates
 */
export async function getCustomHostname(hostnameId: string): Promise<GetCustomHostnameResult> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    return {
      success: false,
      error: 'Cloudflare API credentials not configured',
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${hostnameId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = (await response.json()) as CloudflareCustomHostnameResponse;

    if (!data.success || !data.result) {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'Failed to get custom hostname',
      };
    }

    return {
      success: true,
      hostname: data.result,
    };
  } catch (error) {
    console.error('Error getting custom hostname:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// DNS Verification (Legacy - kept for backwards compatibility)
// ============================================================================

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

  // SSL is handled by the hosting platform (Cloudflare Workers/Pages, Vercel, etc.)
  // We mark it as active since the platform handles certificate provisioning
  const sslActive = cnameResult.verified && txtResult.verified;

  const success = cnameResult.verified && txtResult.verified;

  return {
    success,
    cnameVerified: cnameResult.verified,
    txtVerified: txtResult.verified,
    sslActive,
    errors,
  };
}
