import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { addCustomHostname } from '@/lib/dns';

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
    const { data, error } = await supabaseAdmin
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
    const { data: existing } = await supabaseAdmin
      .from('custom_domains')
      .select('id')
      .eq('domain', domain)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 400 });
    }

    // Create custom hostname in Cloudflare FIRST to get actual verification records
    const cloudflareResult = await addCustomHostname(domain);

    if (!cloudflareResult.success) {
      console.error('Failed to register domain with Cloudflare:', cloudflareResult.error);
      return NextResponse.json(
        { error: cloudflareResult.error || 'Failed to register domain with Cloudflare' },
        { status: 500 }
      );
    }

    // Build DNS records from Cloudflare's response
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'linear.gratis';
    const dns_records: Array<{ type: string; name: string; value: string; purpose: string }> = [
      {
        type: 'CNAME',
        name: domain,
        value: appDomain,
        purpose: 'routing',
      },
    ];

    // Add ownership verification TXT record if provided by Cloudflare
    if (cloudflareResult.ownershipVerification) {
      dns_records.push({
        type: 'TXT',
        name: cloudflareResult.ownershipVerification.name,
        value: cloudflareResult.ownershipVerification.value,
        purpose: 'ownership',
      });
    }

    // Add SSL validation records if provided (may be empty initially)
    if (cloudflareResult.sslValidationRecords) {
      for (const record of cloudflareResult.sslValidationRecords) {
        if (record.txt_name && record.txt_value) {
          dns_records.push({
            type: 'TXT',
            name: record.txt_name,
            value: record.txt_value,
            purpose: 'ssl',
          });
        }
      }
    }

    // Insert domain with Cloudflare data
    const { data, error } = await supabaseAdmin
      .from('custom_domains')
      .insert({
        user_id: user.id,
        domain,
        verification_token: '', // No longer used - Cloudflare handles verification
        dns_records,
        target_type,
        target_slug,
        verification_status: 'pending',
        ssl_status: cloudflareResult.sslStatus === 'active' ? 'active' : 'pending',
        cloudflare_hostname_id: cloudflareResult.hostnameId,
        cloudflare_hostname_status: cloudflareResult.hostnameStatus,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom domain:', error);
      // Try to clean up the Cloudflare hostname if database insert failed
      if (cloudflareResult.hostnameId) {
        const { removeCustomHostname } = await import('@/lib/dns');
        await removeCustomHostname(cloudflareResult.hostnameId).catch(console.error);
      }
      return NextResponse.json({ error: 'Failed to create custom domain' }, { status: 500 });
    }

    return NextResponse.json({
      domain: data,
      success: true,
      message: 'Domain registered. Please add the DNS records shown below to verify ownership.',
    });
  } catch (error) {
    console.error('Error in POST /api/domains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
