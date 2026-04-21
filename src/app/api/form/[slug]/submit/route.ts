import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/lib/encryption'
import * as z from 'zod'

const submitSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  externalId: z.string().max(200).optional(),
  issueTitle: z.string().min(1).max(300),
  issueBody: z.string().min(1).max(10000),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
})

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

    const body = (await request.json()) as unknown
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid submission', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const values = parsed.data

    // Look up the form by slug, active only.
    const { data: form, error: formError } = await supabaseAdmin
      .from('customer_request_forms')
      .select('id, user_id, project_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (formError || !form) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 })
    }

    // Look up the owner's encrypted Linear token server-side.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', form.user_id)
      .single()

    if (profileError || !profile?.linear_api_token) {
      return NextResponse.json(
        { success: false, error: 'Form configuration error. Please contact the form owner.' },
        { status: 500 }
      )
    }

    // Decrypt server-side only; token never leaves the server.
    let linearToken: string
    try {
      linearToken = decryptToken(profile.linear_api_token)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Form configuration error. Please contact the form owner.' },
        { status: 500 }
      )
    }

    const customerData = {
      name: values.customerName,
      email: values.customerEmail,
      ...(values.externalId ? { externalId: values.externalId } : {}),
    }
    const requestData = {
      title: values.issueTitle,
      body: values.issueBody,
      ...(values.attachmentUrl ? { attachmentUrl: values.attachmentUrl } : {}),
    }

    const linearResult = await createLinearCustomerRequest(
      linearToken,
      customerData,
      requestData,
      form.project_id
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
