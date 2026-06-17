import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchAvailableIssueTemplates, type LinearEditorContent } from '@/lib/linear-templates'
import { resolveLinearTokenForForm } from '@/lib/public-form'

type PublicFormConfigRow = {
  id: string
  user_id?: string | null
  organisation_id?: string | null
  linear_connection_id?: string | null
  name: string
  slug: string
  project_name?: string | null
  linear_project_name?: string | null
  linear_project_id?: string | null
  form_title: string
  description?: string | null
  is_active: boolean
  linear_template_id?: string | null
  linear_template_name?: string | null
  allow_template_selection?: boolean
}

type PublicFormTemplate = {
  id: string
  name: string
  description: string | null
  description_content: LinearEditorContent | null
  team: { id: string; name: string; key?: string | null } | null
}

type PublicFormApiPayload = {
  success: true
  form: {
    id: string
    user_id?: string | null
    name: string
    slug: string
    project_name?: string | null
    form_title: string
    description?: string | null
    is_active: boolean
    linear_template_id: string | null
    linear_template_name: string | null
    linear_template_description: string | null
    linear_template_description_content: LinearEditorContent | null
    allow_template_selection: boolean
    available_templates: PublicFormTemplate[]
  }
}

type PublicFormCacheEntry = {
  expiresAt: number
  payload: PublicFormApiPayload
}

const PUBLIC_FORM_CACHE_TTL_MS = 60_000
const PUBLIC_FORM_RESPONSE_CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=120'
const publicFormConfigCache = new Map<string, PublicFormCacheEntry>()

function getRuntimeCache(): Cache | null {
  const runtimeCaches = globalThis.caches as (CacheStorage & { default?: Cache }) | undefined
  return runtimeCaches?.default ?? null
}

function getPublicFormCacheKey(request: NextRequest, slug: string) {
  const url = new URL(request.url)
  url.pathname = `/api/form/${encodeURIComponent(slug)}`
  url.search = ''
  return new Request(url.toString(), { method: 'GET' })
}

function getPublicFormCacheHeaders(status: 'HIT' | 'MISS'): Record<string, string> {
  return {
    'Cache-Control': PUBLIC_FORM_RESPONSE_CACHE_CONTROL,
    'X-Linear-Gratis-Form-Cache': status,
  }
}

function getCachedPublicFormPayload(slug: string): PublicFormApiPayload | null {
  const cached = publicFormConfigCache.get(slug)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    publicFormConfigCache.delete(slug)
    return null
  }

  return cached.payload
}

function setCachedPublicFormPayload(slug: string, payload: PublicFormApiPayload) {
  publicFormConfigCache.set(slug, {
    expiresAt: Date.now() + PUBLIC_FORM_CACHE_TTL_MS,
    payload,
  })
}

async function getRuntimeCachedPublicFormPayload(
  request: NextRequest,
  slug: string,
): Promise<PublicFormApiPayload | null> {
  const cache = getRuntimeCache()
  if (!cache) return null

  try {
    const response = await cache.match(getPublicFormCacheKey(request, slug))
    if (!response) return null
    return (await response.json()) as PublicFormApiPayload
  } catch (error) {
    console.warn('Error reading public form cache:', error)
    return null
  }
}

async function setRuntimeCachedPublicFormPayload(
  request: NextRequest,
  slug: string,
  payload: PublicFormApiPayload,
) {
  const cache = getRuntimeCache()
  if (!cache) return

  try {
    await cache.put(
      getPublicFormCacheKey(request, slug),
      new Response(JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${PUBLIC_FORM_CACHE_TTL_MS / 1000}`,
        },
      }),
    )
  } catch (error) {
    console.warn('Error writing public form cache:', error)
  }
}

async function loadActivePublicForm(slug: string): Promise<PublicFormConfigRow | null> {
  const expanded = await supabaseAdmin
    .from('customer_request_forms')
    .select(`
      id,
      user_id,
      organisation_id,
      linear_connection_id,
      name,
      slug,
      project_name,
      linear_project_name,
      linear_project_id,
      form_title,
      description,
      is_active,
      linear_template_id,
      linear_template_name,
      allow_template_selection
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!expanded.error && expanded.data) return expanded.data as PublicFormConfigRow

  if (
    expanded.error?.code === '42703' ||
    expanded.error?.message?.includes('linear_template_id') ||
    expanded.error?.message?.includes('linear_template_name') ||
    expanded.error?.message?.includes('linear_project_id') ||
    expanded.error?.message?.includes('linear_project_name') ||
    expanded.error?.message?.includes('linear_connection_id') ||
    expanded.error?.message?.includes('allow_template_selection')
  ) {
    const legacy = await supabaseAdmin
      .from('customer_request_forms')
      .select('id, user_id, name, slug, project_name, form_title, description, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!legacy.error && legacy.data) return legacy.data as PublicFormConfigRow
  }

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 })
    }

    const cachedPayload = getCachedPublicFormPayload(slug)
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, {
        headers: getPublicFormCacheHeaders('HIT'),
      })
    }

    const runtimeCachedPayload = await getRuntimeCachedPublicFormPayload(request, slug)
    if (runtimeCachedPayload) {
      setCachedPublicFormPayload(slug, runtimeCachedPayload)
      return NextResponse.json(runtimeCachedPayload, {
        headers: getPublicFormCacheHeaders('HIT'),
      })
    }

    const form = await loadActivePublicForm(slug)

    if (!form) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 })
    }

    let availableTemplates: PublicFormTemplate[] = []
    let linearTemplateDescription: string | null = null
    let linearTemplateDescriptionContent: LinearEditorContent | null = null

    const projectId = form.linear_project_id
    if ((form.allow_template_selection || form.linear_template_id) && projectId) {
      const linearToken = await resolveLinearTokenForForm(form)
      if (linearToken) {
        const templatesResult = await fetchAvailableIssueTemplates(linearToken, { projectId })
        if (templatesResult.success) {
          const templateOptions = templatesResult.templates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            description_content: template.descriptionContent,
            team: template.team,
          }))
          availableTemplates = form.allow_template_selection ? templateOptions : []
          const defaultTemplate = templateOptions.find(
            (template) => template.id === form.linear_template_id,
          )
          linearTemplateDescription = defaultTemplate?.description ?? null
          linearTemplateDescriptionContent = defaultTemplate?.description_content ?? null
        }
      }
    }

    const payload: PublicFormApiPayload = {
      success: true,
      form: {
        id: form.id,
        user_id: form.user_id,
        name: form.name,
        slug: form.slug,
        project_name: form.linear_project_name || form.project_name,
        form_title: form.form_title,
        description: form.description,
        is_active: form.is_active,
        linear_template_id: form.linear_template_id ?? null,
        linear_template_name: form.linear_template_name ?? null,
        linear_template_description: linearTemplateDescription,
        linear_template_description_content: linearTemplateDescriptionContent,
        allow_template_selection: Boolean(form.allow_template_selection),
        available_templates: availableTemplates,
      },
    }

    setCachedPublicFormPayload(slug, payload)
    await setRuntimeCachedPublicFormPayload(request, slug, payload)

    return NextResponse.json(payload, {
      headers: getPublicFormCacheHeaders('MISS'),
    })
  } catch (error) {
    console.error('Error in GET /api/form/[slug]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
