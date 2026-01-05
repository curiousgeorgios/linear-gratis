import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

interface BrandingSettings {
  logo_url?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
  favicon_url?: string | null;
  brand_name?: string | null;
  tagline?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  border_color?: string | null;
  font_family?: string | null;
  heading_font_family?: string | null;
  footer_text?: string | null;
  footer_links?: unknown;
  show_powered_by?: boolean | null;
  social_links?: unknown;
  custom_css?: string | null;
}

// Helper to convert undefined to null for database operations
// JSON.stringify omits undefined values, so we need to explicitly set null
const normalise = <T>(value: T | undefined | null): T | null =>
  value === undefined ? null : value;

// GET - Fetch user's branding settings
export async function GET() {
  try {
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch branding settings
    const { data, error } = await supabaseAdmin
      .from('branding_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching branding settings:', error);
      return NextResponse.json({ error: 'Failed to fetch branding settings' }, { status: 500 });
    }

    return NextResponse.json({ branding: data || null });
  } catch (error) {
    console.error('Error in GET /api/branding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update branding settings
export async function POST(request: NextRequest) {
  try {
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as BrandingSettings;

    // Check if branding settings already exist
    const { data: existing } = await supabaseAdmin
      .from('branding_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existing) {
      // Update existing settings
      result = await supabaseAdmin
        .from('branding_settings')
        .update({
          logo_url: normalise(body.logo_url),
          logo_width: normalise(body.logo_width),
          logo_height: normalise(body.logo_height),
          favicon_url: normalise(body.favicon_url),
          brand_name: normalise(body.brand_name),
          tagline: normalise(body.tagline),
          primary_color: normalise(body.primary_color),
          secondary_color: normalise(body.secondary_color),
          accent_color: normalise(body.accent_color),
          background_color: normalise(body.background_color),
          text_color: normalise(body.text_color),
          border_color: normalise(body.border_color),
          font_family: normalise(body.font_family),
          heading_font_family: normalise(body.heading_font_family),
          footer_text: normalise(body.footer_text),
          footer_links: normalise(body.footer_links),
          show_powered_by: normalise(body.show_powered_by),
          social_links: normalise(body.social_links),
          custom_css: normalise(body.custom_css),
        })
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      // Create new settings
      result = await supabaseAdmin
        .from('branding_settings')
        .insert({
          user_id: user.id,
          logo_url: normalise(body.logo_url),
          logo_width: normalise(body.logo_width),
          logo_height: normalise(body.logo_height),
          favicon_url: normalise(body.favicon_url),
          brand_name: normalise(body.brand_name),
          tagline: normalise(body.tagline),
          primary_color: normalise(body.primary_color),
          secondary_color: normalise(body.secondary_color),
          accent_color: normalise(body.accent_color),
          background_color: normalise(body.background_color),
          text_color: normalise(body.text_color),
          border_color: normalise(body.border_color),
          font_family: normalise(body.font_family),
          heading_font_family: normalise(body.heading_font_family),
          footer_text: normalise(body.footer_text),
          footer_links: normalise(body.footer_links),
          show_powered_by: normalise(body.show_powered_by),
          social_links: normalise(body.social_links),
          custom_css: normalise(body.custom_css),
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving branding settings:', result.error);
      return NextResponse.json({ error: 'Failed to save branding settings' }, { status: 500 });
    }

    return NextResponse.json({ branding: result.data, success: true });
  } catch (error) {
    console.error('Error in POST /api/branding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete branding settings (reset to defaults)
export async function DELETE() {
  try {
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('branding_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting branding settings:', error);
      return NextResponse.json({ error: 'Failed to delete branding settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/branding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
