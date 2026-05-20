import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/request-security'
import { getActiveConnectionIdForOrg, getTokenForConnection } from '@/lib/linear-connection'
import { uploadFileToLinear } from '@/lib/linear-file-upload'
import {
  MAX_FORM_SUBMIT_BODY_BYTES,
  validateFormAttachmentFile,
} from '@/lib/form-attachment'
import * as z from 'zod'

const submitSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  externalId: z.string().max(200).optional(),
  issueTitle: z.string().min(1).max(300),
  issueBody: z.string().min(1).max(10000),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
})

type SubmitValues = z.infer<typeof submitSchema>

type ParsedSubmitPayload = {
  values: SubmitValues
  attachmentFile?: File
}

type FormLookup = {
  id: string
  user_id?: string
  organisation_id?: string
  linear_connection_id?: string | null
  project_id?: string | null
  linear_project_id?: string | null
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File && value.name.trim().length > 0
}

async function parseSubmitPayload(request: NextRequest): Promise<ParsedSubmitPayload> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const attachmentValue = formData.get('attachmentFile')

    return {
      values: {
        customerName: getFormString(formData, 'customerName'),
        customerEmail: getFormString(formData, 'customerEmail'),
        externalId: getFormString(formData, 'externalId'),
        issueTitle: getFormString(formData, 'issueTitle'),
        issueBody: getFormString(formData, 'issueBody'),
        attachmentUrl: getFormString(formData, 'attachmentUrl'),
      },
      ...(isUploadedFile(attachmentValue) ? { attachmentFile: attachmentValue } : {}),
    }
  }

  return { values: (await request.json()) as SubmitValues }
}

async function loadActiveForm(slug: string): Promise<FormLookup | null> {
  const expanded = await supabaseAdmin
    .from('customer_request_forms')
    .select('id, user_id, organisation_id, linear_connection_id, project_id, linear_project_id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!expanded.error && expanded.data) return expanded.data as FormLookup

  // Legacy fallback for databases that have not applied the linear_connection_id
  // and linear_project_id expand migrations yet.
  if (
    expanded.error?.code === '42703' ||
    expanded.error?.message?.includes('linear_connection_id') ||
    expanded.error?.message?.includes('linear_project_id')
  ) {
    const legacy = await supabaseAdmin
      .from('customer_request_forms')
      .select('id, user_id, project_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!legacy.error && legacy.data) return legacy.data as FormLookup
  }

  return null
}

async function resolveLinearTokenForForm(form: FormLookup): Promise<string | null> {
  if (form.linear_connection_id) {
    return getTokenForConnection(form.linear_connection_id)
  }

  const connectionId = form.organisation_id
    ? await getActiveConnectionIdForOrg(supabaseAdmin, form.organisation_id)
    : null
  if (connectionId) {
    await supabaseAdmin
      .from('customer_request_forms')
      .update({ linear_connection_id: connectionId })
      .eq('id', form.id)
      .is('linear_connection_id', null)

    return getTokenForConnection(connectionId)
  }

  if (!form.user_id) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('linear_api_token')
    .eq('id', form.user_id)
    .single()

  if (!profile?.linear_api_token) return null

  try {
    return await decryptAndRotateTokenIfNeeded(profile.linear_api_token, {
      userId: form.user_id,
      admin: supabaseAdmin,
    })
  } catch {
    return null
  }
}

/**
 * Creates a Linear customer need via a direct GraphQL call.
 *
 * Mirrors the logic in /api/linear but is called in-process so the Linear
 * API token never leaves the server. Returning a minimal `{ id }` for
 * customer and request prevents leaking extra Linear metadata to the
 * public form caller.
 */
async function createLinearCustomerRequest(
  apiToken: string,
  customerData: {
    name: string
    email: string
    externalId?: string
  },
  requestData: {
    title: string
    body: string
    attachmentUrl?: string
  },
  projectId: string
): Promise<
  | { success: true; customer?: { id: string }; request?: { id: string } }
  | { success: false; error: string }
> {
  const customerNeedInput: Record<string, unknown> = {
    customerExternalId: customerData.externalId || customerData.email,
    projectId,
    body: `${requestData.title}\n\n${requestData.body}`,
    ...(requestData.attachmentUrl ? { attachmentUrl: requestData.attachmentUrl } : {}),
  }

  const mutation = `
    mutation CustomerNeedCreate($input: CustomerNeedCreateInput!) {
      customerNeedCreate(input: $input) {
        success
        need {
          id
          customer {
            id
          }
        }
      }
    }
  `

  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken.trim(),
      },
      body: JSON.stringify({
        query: mutation,
        variables: { input: customerNeedInput },
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Linear API error: ${response.status} ${response.statusText}`,
      }
    }

    const result = (await response.json()) as {
      data?: {
        customerNeedCreate: {
          success: boolean
          need: {
            id: string
            customer: {
              id: string
            }
          }
        }
      }
      errors?: Array<{ message: string }>
    }

    if (result.errors) {
      return {
        success: false,
        error: `GraphQL errors: ${result.errors.map((e) => e.message).join(', ')}`,
      }
    }

    if (!result.data) {
      return { success: false, error: 'No data returned from Linear API' }
    }

    if (!result.data.customerNeedCreate.success) {
      return { success: false, error: 'Failed to create customer request' }
    }

    const need = result.data.customerNeedCreate.need
    return {
      success: true,
      customer: { id: need.customer.id },
      request: { id: need.id },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 })
    }

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_FORM_SUBMIT_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Attachment is too large.' },
        { status: 413 }
      )
    }

    const clientIp = getClientIp(request)
    const rateLimit = await checkRateLimit(`form-submit:${slug}:${clientIp}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds)

    const payload = await parseSubmitPayload(request)
    const parsed = submitSchema.safeParse(payload.values)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid submission', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const values = parsed.data
    const attachmentFile = payload.attachmentFile
    if (attachmentFile) {
      const fileValidation = validateFormAttachmentFile(attachmentFile)
      if (!fileValidation.ok) {
        return NextResponse.json(
          { success: false, error: fileValidation.error },
          { status: 400 }
        )
      }
    }

    const form = await loadActiveForm(slug)
    if (!form) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 })
    }

    const projectId = form.linear_project_id || form.project_id
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Form configuration error. Please contact the form owner.' },
        { status: 500 }
      )
    }

    const linearToken = await resolveLinearTokenForForm(form)
    if (!linearToken) {
      return NextResponse.json(
        { success: false, error: 'Form configuration error. Please contact the form owner.' },
        { status: 500 }
      )
    }

    let attachmentUrl = values.attachmentUrl || undefined
    if (attachmentFile) {
      const uploadResult = await uploadFileToLinear(linearToken, attachmentFile)
      if (!uploadResult.success) {
        return NextResponse.json(
          { success: false, error: uploadResult.error || 'Failed to upload attachment' },
          { status: 502 }
        )
      }
      attachmentUrl = uploadResult.assetUrl
    }

    const customerData = {
      name: values.customerName,
      email: values.customerEmail,
      ...(values.externalId ? { externalId: values.externalId } : {}),
    }
    const requestData = {
      title: values.issueTitle,
      body: values.issueBody,
      ...(attachmentUrl ? { attachmentUrl } : {}),
    }

    const linearResult = await createLinearCustomerRequest(
      linearToken,
      customerData,
      requestData,
      projectId
    )

    if (!linearResult.success) {
      return NextResponse.json(
        { success: false, error: linearResult.error || 'Failed to submit request' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        customer: linearResult.customer,
        request: linearResult.request,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/form/[slug]/submit:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
