import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 })
    }

    const { data: form, error } = await supabaseAdmin
      .from('customer_request_forms')
      .select('id, user_id, name, slug, project_name, form_title, description, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !form) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      form,
    })
  } catch (error) {
    console.error('Error in GET /api/form/[slug]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
