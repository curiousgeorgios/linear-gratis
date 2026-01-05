import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Upload a logo to Supabase storage
export async function POST(request: NextRequest) {
  try {
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'logo' or 'favicon'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, SVG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large. Maximum 2MB allowed.' }, { status: 400 });
    }

    // Create unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${type}-${Date.now()}.${fileExtension}`;

    // Convert File to ArrayBuffer then to Uint8Array for Supabase storage
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage using admin client to bypass RLS
    const { error } = await supabaseAdmin.storage
      .from('branding')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading to storage:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from('branding').getPublicUrl(fileName);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: fileName,
      success: true,
    });
  } catch (error) {
    console.error('Error in POST /api/branding/upload-logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a logo from Supabase storage
export async function DELETE(request: NextRequest) {
  try {
    // Get user from cookie-based session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await request.json() as { path: string };

    if (!path) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Ensure user can only delete their own files
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.storage.from('branding').remove([path]);

    if (error) {
      console.error('Error deleting from storage:', error);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/branding/upload-logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
