'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBrandingSettings, applyBrandingToPage, getBrandingStyles } from '@/hooks/use-branding'

const formSchema = z.object({
  customerName: z.string().min(1, 'Your name is required'),
  customerEmail: z.string().email('Valid email is required'),
  externalId: z.string().optional(),
  issueTitle: z.string().min(1, 'Issue title is required'),
  issueBody: z.string().min(1, 'Issue description is required'),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
})

type FormData = z.infer<typeof formSchema>

type PublicFormConfig = {
  id: string
  user_id: string
  name: string
  slug: string
  project_name: string
  form_title: string
  description?: string
  is_active: boolean
}

export default function PublicFormPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [formConfig, setFormConfig] = useState<PublicFormConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: {
      customer?: { id: string }
      request?: { id: string }
    }
  } | null>(null)

  // Load branding settings for this form's owner
  const { branding } = useBrandingSettings(
    formConfig?.user_id || null,
    formConfig ? { type: 'form', slug: formConfig.slug } : null,
  )

  // Parse URL parameters for prefilling
  const getUrlPrefillData = useCallback((): Partial<FormData> => {
    if (!searchParams) return {}

    return {
      customerName: searchParams.get('name') || '',
      customerEmail: searchParams.get('email') || '',
      externalId: searchParams.get('ref') || '',
      issueTitle: searchParams.get('title') || '',
      issueBody: searchParams.get('body') || '',
      attachmentUrl: searchParams.get('attachment') || '',
    }
  }, [searchParams])

  const prefillData = getUrlPrefillData()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: prefillData.customerName || '',
      customerEmail: prefillData.customerEmail || '',
      externalId: prefillData.externalId || '',
      issueTitle: prefillData.issueTitle || '',
      issueBody: prefillData.issueBody || '',
      attachmentUrl: prefillData.attachmentUrl || '',
    },
  })

  const loadFormConfig = useCallback(async () => {
    try {
      const response = await fetch(`/api/form/${encodeURIComponent(slug)}`)
      const data = (await response.json()) as {
        success?: boolean
        form?: PublicFormConfig
        error?: string
      }

      if (!response.ok || !data.success || !data.form) {
        console.error('Error loading form config:', data.error || response.statusText)
      } else {
        setFormConfig(data.form)
      }
    } catch (error) {
      console.error('Error loading form config:', error)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadFormConfig()
  }, [loadFormConfig])

  // Apply branding when it loads
  useEffect(() => {
    if (branding) {
      applyBrandingToPage(branding, formConfig?.form_title)
    }
  }, [branding, formConfig?.form_title])

  const onFormSubmit = async (values: FormData) => {
    if (!formConfig) return

    setSubmitting(true)
    setResult(null)

    try {
      const response = await fetch(`/api/form/${encodeURIComponent(slug)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = (await response.json()) as {
        success: boolean
        error?: string
        data?: {
          customer?: { id: string }
          request?: { id: string }
        }
      }

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: 'Your request has been submitted successfully! We\'ll get back to you soon.',
          data: data.data,
        })
        form.reset()
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to submit request. Please try again.',
        })
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setResult({
        success: false,
        message: 'Network error. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load the form.</p>
        </div>
      </div>
    )
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Form not found</CardTitle>
            <CardDescription>
              The form you&apos;re looking for doesn&apos;t exist or has been deactivated.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen linear-gradient-bg py-8" style={getBrandingStyles(branding)}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Custom header with logo if branding is set */}
        {branding && (branding.logo_url || branding.brand_name) && (
          <div className="mb-6 text-center">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-provided URL, domain not known at build time
              <img
                src={branding.logo_url}
                alt={branding.brand_name || 'Logo'}
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxHeight: `${branding.logo_height || 40}px`,
                  objectFit: 'contain',
                }}
                className="mx-auto mb-4"
              />
            ) : branding.brand_name ? (
              <h1 className="text-2xl font-bold mb-2">{branding.brand_name}</h1>
            ) : null}
            {branding.tagline && (
              <p className="text-muted-foreground">{branding.tagline}</p>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{formConfig.form_title}</CardTitle>
            {formConfig.description && (
              <CardDescription>{formConfig.description}</CardDescription>
            )}
            {!branding?.brand_name && (
              <div className="text-sm text-gray-600">
                Project: {formConfig.project_name}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="externalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference ID (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your internal reference ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the issue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please provide a detailed description of your issue or request..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attachmentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attachment URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/screenshot.png"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Submitting...' : 'Submit request'}
                </Button>
              </form>
            </Form>

            {result && (
              <div className={`mt-6 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="font-medium">
                  {result.success ? 'Success!' : 'Error'}
                </p>
                <p className="text-sm mt-1">{result.message}</p>
                {result.success && result.data && (
                  <div className="mt-3 text-xs">
                    <p><strong>Request ID:</strong> {result.data.request?.id}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom footer — skip rendering when there's nothing to show. */}
        {(() => {
          const showPoweredBy = branding?.show_powered_by !== false
          if (!branding?.footer_text && !showPoweredBy) return null
          return (
            <div className="text-center mt-6 text-sm text-gray-500">
              {branding?.footer_text ? (
                <p className="whitespace-pre-wrap mb-2">{branding.footer_text}</p>
              ) : null}
              {showPoweredBy && (
                <p>
                  Powered by{' '}
                  <a
                    href="https://linear.gratis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    linear.gratis
                  </a>
                </p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
