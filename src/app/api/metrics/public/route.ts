import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const revalidate = 3600 // Cache for 1 hour

export async function GET() {
  try {
    // Run all count queries in parallel
    const [formsResult, viewsResult, roadmapsResult] = await Promise.all([
      supabaseAdmin
        .from('customer_request_forms')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabaseAdmin
        .from('public_views')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabaseAdmin
        .from('roadmaps')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    // Calculate total items as a proxy for engagement
    const totalItems = (formsResult.count ?? 0) + (viewsResult.count ?? 0) + (roadmapsResult.count ?? 0)

    const metrics = {
      forms: formsResult.count ?? 0,
      views: viewsResult.count ?? 0,
      roadmaps: roadmapsResult.count ?? 0,
      total: totalItems,
    }

    return NextResponse.json({
      success: true,
      metrics,
      cachedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Metrics API error:', error)

    // Return fallback metrics if database query fails
    return NextResponse.json({
      success: true,
      metrics: {
        forms: 0,
        views: 0,
        roadmaps: 0,
        total: 0,
      },
      cachedAt: new Date().toISOString(),
      fallback: true,
    })
  }
}
