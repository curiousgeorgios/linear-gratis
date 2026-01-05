import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Re-export the SSR-compatible browser client factory
export { createClient } from './supabase/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Browser client instance for backwards compatibility with existing code
// Uses cookie-based storage via @supabase/ssr
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Service role client for bypassing RLS in API routes (server-side only)
export const supabaseAdmin = supabaseServiceKey
  ? createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase // Fallback for development without service key

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

export type BrandingSettings = {
  id: string
  user_id: string
  logo_url?: string
  logo_width?: number
  logo_height?: number
  favicon_url?: string
  brand_name?: string
  tagline?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  background_color?: string
  text_color?: string
  border_color?: string
  font_family?: string
  heading_font_family?: string
  footer_text?: string
  footer_links?: {
    label: string
    url: string
  }[]
  show_powered_by?: boolean
  social_links?: {
    [key: string]: string
  }
  custom_css?: string
  created_at: string
  updated_at: string
}

export type CustomDomain = {
  id: string
  user_id: string
  domain: string
  subdomain?: string
  verification_token: string
  verification_status: 'pending' | 'verified' | 'failed'
  verified_at?: string
  dns_records?: {
    type: string
    name: string
    value: string
    purpose?: 'routing' | 'ownership' | 'ssl'
  }[]
  ssl_status: 'pending' | 'active' | 'failed'
  ssl_issued_at?: string
  redirect_to_https?: boolean
  is_active: boolean
  target_type?: 'form' | 'view' | 'roadmap'
  target_slug?: string
  last_checked_at?: string
  error_message?: string
  cloudflare_hostname_id?: string
  cloudflare_hostname_status?: 'pending' | 'active' | 'pending_deletion' | 'moved' | 'deleted'
  created_at: string
  updated_at: string
}

export type KanbanColumn = {
  key: string
  label: string
  state_types: string[]
}

export type Roadmap = {
  id: string
  user_id: string
  name: string
  slug: string
  title: string
  description?: string
  layout_type: 'kanban' | 'timeline'
  timeline_granularity: 'month' | 'quarter'
  kanban_columns: KanbanColumn[]
  project_ids: string[]
  show_item_descriptions: boolean
  show_item_dates: boolean
  show_progress_percentage: boolean
  show_vote_counts: boolean
  show_comment_counts: boolean
  allow_voting: boolean
  allow_comments: boolean
  require_email_for_comments: boolean
  moderate_comments: boolean
  is_active: boolean
  password_protected: boolean
  password_hash?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export type RoadmapVote = {
  id: string
  roadmap_id: string
  issue_id: string
  visitor_fingerprint: string
  ip_hash?: string
  created_at: string
}

export type RoadmapComment = {
  id: string
  roadmap_id: string
  issue_id: string
  author_name: string
  author_email: string
  author_email_verified: boolean
  content: string
  is_approved: boolean
  is_hidden: boolean
  parent_id?: string
  visitor_fingerprint?: string
  ip_hash?: string
  created_at: string
  updated_at: string
}

