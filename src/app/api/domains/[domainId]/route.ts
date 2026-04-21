import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';
import { removeCustomHostname } from '@/lib/dns';

interface DomainUpdateBody {
  is_active?: boolean;
  redirect_to_https?: boolean;
  target_type?: string;
  target_slug?: string;
}

// GET - Fetch a specific custom domain
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = await params;

    // Fetch domain
    const { data, error } = await supabaseAdmin!
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
  _request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = await params;
    const body = await request.json() as DomainUpdateBody;

    // Load the existing row so that partial target updates can be validated
    // against the stored values, and so that we confirm the caller owns the
    // domain before touching anything.
    const { data: currentDomain, error: currentError } = await supabaseAdmin!
      .from('custom_domains')
      .select('target_type, target_slug')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single();

    if (currentError || !currentDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const existingTargetType = currentDomain.target_type as string | null;
    const existingTargetSlug = currentDomain.target_slug as string | null;

    if (body.target_type !== undefined || body.target_slug !== undefined) {
      // If target fields are being updated, both must resolve to a concrete
      // value and the target resource must belong to the caller. This closes
      // a phishing vector where a user could retarget their own verified
      // custom domain at another user's public view, form or roadmap.
      const nextTargetType = body.target_type ?? existingTargetType;
      const nextTargetSlug = body.target_slug ?? existingTargetSlug;

      if (!nextTargetType || !nextTargetSlug) {
        return NextResponse.json(
          { error: 'target_type and target_slug must both be set' },
          { status: 400 },
        );
      }

      const tableByType: Record<string, string> = {
        view: 'public_views',
        form: 'customer_request_forms',
        roadmap: 'roadmaps',
      };
      const targetTable = tableByType[nextTargetType];
      if (!targetTable) {
        return NextResponse.json(
          { error: 'Unknown target_type' },
          { status: 400 },
        );
      }

      const { data: targetRow, error: targetError } = await supabaseAdmin!
        .from(targetTable)
        .select('user_id')
        .eq('slug', nextTargetSlug)
        .eq('user_id', user.id)
        .maybeSingle();

      if (targetError || !targetRow) {
        return NextResponse.json(
          { error: 'Target not found or not owned by caller' },
          { status: 403 },
        );
      }
    }

    const { data, error } = await supabaseAdmin!
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
