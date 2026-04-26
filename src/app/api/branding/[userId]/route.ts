import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, type BrandingSettings } from '@/lib/supabase';

type BrandingContextType = 'view' | 'roadmap' | 'form';

function sanitizeBrandingSettings(data: BrandingSettings) {
  return {
    logo_url: data.logo_url,
    logo_height: data.logo_height,
    favicon_url: data.favicon_url,
    brand_name: data.brand_name,
    tagline: data.tagline,
    primary_color: data.primary_color,
    secondary_color: data.secondary_color,
    accent_color: data.accent_color,
    background_color: data.background_color,
    text_color: data.text_color,
    border_color: data.border_color,
    font_family: data.font_family,
    heading_font_family: data.heading_font_family,
    footer_text: data.footer_text,
    footer_links: data.footer_links,
    show_powered_by: data.show_powered_by,
    social_links: data.social_links,
    custom_css: data.custom_css,
  };
}

async function verifyBrandingContext(
  userId: string,
  type: BrandingContextType,
  slug: string,
): Promise<boolean> {
  if (type === 'form') {
    const { data } = await supabaseAdmin
      .from('customer_request_forms')
      .select('user_id, is_active')
      .eq('user_id', userId)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    return Boolean(data);
  }

  const tableName = type === 'view' ? 'public_views' : 'roadmaps';
  const { data } = await supabaseAdmin
    .from(tableName)
    .select('user_id, is_active, expires_at')
    .eq('user_id', userId)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return false;

  const maybeExpiringData = data as { expires_at?: string | null };
  return !maybeExpiringData.expires_at || new Date(maybeExpiringData.expires_at) >= new Date();
}

// GET - Fetch branding settings for a specific user (public access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as BrandingContextType | null;
    const slug = searchParams.get('slug');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!type || !['view', 'roadmap', 'form'].includes(type) || !slug) {
      return NextResponse.json(
        { error: 'Branding context type and slug are required' },
        { status: 400 }
      );
    }

    const contextIsValid = await verifyBrandingContext(userId, type, slug);
    if (!contextIsValid) {
      return NextResponse.json({ error: 'Branding context not found' }, { status: 404 });
    }

    // Fetch branding settings
    const { data, error } = await supabaseAdmin
      .from('branding_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching branding settings:', error);
      return NextResponse.json({ error: 'Failed to fetch branding settings' }, { status: 500 });
    }

    return NextResponse.json({
      branding: data ? sanitizeBrandingSettings(data as BrandingSettings) : null,
    });
  } catch (error) {
    console.error('Error in GET /api/branding/[userId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
