/**
 * Edge-compatible database functions using Supabase REST API directly.
 * These functions use fetch() instead of the Supabase client to work in Edge Runtime.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type CustomDomain = {
  domain: string
  redirect_to_https?: boolean
  target_type?: 'form' | 'view' | 'roadmap'
  target_slug?: string
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
    const normalizedHostname = hostname.trim().toLowerCase()
    // Use direct REST API call for edge compatibility
    const url = new URL(`${supabaseUrl}/rest/v1/public_custom_domain_routes`)
    url.searchParams.set('select', 'domain,target_type,target_slug,redirect_to_https')
    url.searchParams.set('domain', `eq.${normalizedHostname}`)
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
