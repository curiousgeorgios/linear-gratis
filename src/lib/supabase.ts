import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for bypassing RLS in API routes
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase

export type Profile = {
  id: string
  email: string
  linear_api_token?: string
  created_at: string
  updated_at: string
}

export type CustomerRequestForm = {
  id: string
  user_id: string
  name: string
  slug: string
  project_id: string
  project_name: string
  form_title: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PublicView = {
  id: string
  user_id: string
  name: string
  slug: string
  project_id?: string
  team_id?: string
  project_name?: string
  team_name?: string
  view_title: string
  description?: string
  is_active: boolean
  show_assignees: boolean
  show_labels: boolean
  show_priorities: boolean
  show_descriptions: boolean
  allowed_statuses: string[]
  password_protected: boolean
  password_hash?: string
  expires_at?: string
  allow_issue_creation: boolean
  created_at: string
  updated_at: string
}