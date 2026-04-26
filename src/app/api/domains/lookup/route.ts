import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Look up a custom domain by domain name (for middleware/routing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 });
    }
    const normalizedDomain = domain.trim().toLowerCase();

    // Look up the domain. Only expose the fields the middleware needs for
    // routing; never leak user_id, cloudflare_hostname_id, verification_token
    // or dns_records to anonymous callers.
    const { data, error } = await supabase
      .from('public_custom_domain_routes')
      .select('target_type, target_slug, redirect_to_https')
      .eq('domain', normalizedDomain)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching domain found
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
      }
      console.error('Error looking up domain:', error);
      return NextResponse.json({ error: 'Failed to look up domain' }, { status: 500 });
    }

    return NextResponse.json({ domain: data });
  } catch (error) {
    console.error('Error in GET /api/domains/lookup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
