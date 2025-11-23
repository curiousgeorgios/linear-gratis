import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const runtime = 'edge';

interface DomainCreateBody {
  domain: string;
  target_type: string;
  target_slug: string;
}

// GET - Fetch user's custom domains
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch custom domains
    const { data, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom domains:', error);
      return NextResponse.json({ error: 'Failed to fetch custom domains' }, { status: 500 });
    }

    return NextResponse.json({ domains: data || [] });
  } catch (error) {
    console.error('Error in GET /api/domains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new custom domain
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as DomainCreateBody;
    const { domain, target_type, target_slug } = body;

    if (!domain || !target_type || !target_slug) {
      return NextResponse.json(
        { error: 'Domain, target type, and target slug are required' },
        { status: 400 }
      );
    }

    // Validate domain format (basic validation)
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Check if domain already exists
    const { data: existing } = await supabase
      .from('custom_domains')
      .select('id')
      .eq('domain', domain)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 400 });
    }

    // Generate verification token
    const verification_token = `linear-verify-${crypto.randomBytes(16).toString('hex')}`;

    // Prepare DNS records
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'linear.gratis';
    const dns_records = [
      {
        type: 'CNAME',
        name: domain,
        value: appDomain,
      },
      {
        type: 'TXT',
        name: `_linear-verification.${domain}`,
        value: verification_token,
      },
    ];

    // Insert domain
    const { data, error } = await supabase
      .from('custom_domains')
      .insert({
        user_id: user.id,
        domain,
        verification_token,
        dns_records,
        target_type,
        target_slug,
        verification_status: 'pending',
        ssl_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom domain:', error);
      return NextResponse.json({ error: 'Failed to create custom domain' }, { status: 500 });
    }

    return NextResponse.json({ domain: data, success: true });
  } catch (error) {
    console.error('Error in POST /api/domains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
