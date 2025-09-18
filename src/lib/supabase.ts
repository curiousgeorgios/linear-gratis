import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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