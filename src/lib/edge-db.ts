/**
 * Edge-compatible database functions using Supabase REST API directly.
 * These functions use fetch() instead of the Supabase client to work in Edge Runtime.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type CustomDomain = {
  id: string
  user_id: string
  domain: string
  subdomain?: string
  verification_token: string
  verification_status: 'pending' | 'verified' | 'failed'
  verified_at?: string
  dns_records?: {
    type: string
    name: string
    value: string
    purpose?: 'routing' | 'ownership' | 'ssl'
  }[]
  ssl_status: 'pending' | 'active' | 'failed'
  ssl_issued_at?: string
  redirect_to_https?: boolean
  is_active: boolean
  target_type?: 'form' | 'view' | 'roadmap'
  target_slug?: string
  last_checked_at?: string
  error_message?: string
  cloudflare_hostname_id?: string
  cloudflare_hostname_status?: 'pending' | 'active' | 'pending_deletion' | 'moved' | 'deleted'
  created_at: string
  updated_at: string
}

/**
 * Look up a verified and active custom domain by hostname.
 * Uses direct REST API call to be edge-compatible (for middleware).
 *
 * @param hostname - The domain to look up
 * @returns The domain data if found, null if not found, or an error
 */
export async function lookupCustomDomain(
  hostname: string
): Promise<
  | { success: true; domain: CustomDomain }
  | { success: false; notFound: true; error?: undefined }
  | { success: false; notFound?: undefined; error: string }
> {
  try {
    // Use direct REST API call for edge compatibility
    const url = new URL(`${supabaseUrl}/rest/v1/custom_domains`)
    url.searchParams.set('domain', `eq.${hostname}`)
    url.searchParams.set('verification_status', 'eq.verified')
    url.searchParams.set('is_active', 'eq.true')
    url.searchParams.set('limit', '1')

    const response = await fetch(url.toString(), {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Supabase REST error:', response.status, response.statusText)
      return { success: false, error: `Supabase error: ${response.status}` }
    }

    const data = await response.json() as CustomDomain[]

    if (!data || data.length === 0) {
      return { success: false, notFound: true }
    }

    return { success: true, domain: data[0] }
  } catch (error) {
    console.error('Error in lookupCustomDomain:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
