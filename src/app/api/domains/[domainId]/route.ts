import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { removeCustomHostname } from '@/lib/dns';

interface DomainUpdateBody {
  is_active?: boolean;
  redirect_to_https?: boolean;
  target_type?: string;
  target_slug?: string;
}

// GET - Fetch a specific custom domain
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
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

    const { domainId } = await params;

    // Fetch domain
    const { data, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching domain:', error);
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    return NextResponse.json({ domain: data });
  } catch (error) {
    console.error('Error in GET /api/domains/[domainId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a custom domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
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

    const { domainId } = await params;

    // First, fetch the domain to get the Cloudflare hostname ID
    const { data: domain } = await supabaseAdmin
      .from('custom_domains')
      .select('cloudflare_hostname_id')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single();

    // Remove custom hostname from Cloudflare if it exists
    if (domain?.cloudflare_hostname_id) {
      const removeResult = await removeCustomHostname(domain.cloudflare_hostname_id);
      if (!removeResult.success) {
        console.error('Failed to remove custom hostname from Cloudflare:', removeResult.error);
        // Continue with deletion anyway - admin can clean up manually
      }
    }

    // Delete from database
    const { error } = await supabaseAdmin
      .from('custom_domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting domain:', error);
      return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/domains/[domainId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update domain settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
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

    const { domainId } = await params;
    const body = await request.json() as DomainUpdateBody;

    const { data, error } = await supabase
      .from('custom_domains')
      .update({
        is_active: body.is_active,
        redirect_to_https: body.redirect_to_https,
        target_type: body.target_type,
        target_slug: body.target_slug,
      })
      .eq('id', domainId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating domain:', error);
      return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
    }

    return NextResponse.json({ domain: data, success: true });
  } catch (error) {
    console.error('Error in PATCH /api/domains/[domainId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
