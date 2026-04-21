import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptToken } from '@/lib/encryption'
import * as z from 'zod'

const bodySchema = z.object({
  token: z.string().min(1).max(1000),
})

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const encrypted = encryptToken(parsed.data.token)

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ linear_api_token: encrypted })
      .eq('id', user.id)

    if (error) {
      console.error('[api/profile/linear-token PUT] update failed:', error)
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/profile/linear-token PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ linear_api_token: null })
      .eq('id', user.id)

    if (error) {
      console.error('[api/profile/linear-token DELETE] update failed:', error)
      return NextResponse.json({ error: 'Failed to clear token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/profile/linear-token DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET returns only whether a token is configured, never the token itself
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      hasToken: Boolean(profile?.linear_api_token),
    })
  } catch (error) {
    console.error('[api/profile/linear-token GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
