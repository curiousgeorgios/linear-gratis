'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase, CustomerRequestForm } from '@/lib/supabase'
import { decryptToken } from '@/lib/encryption'
import { LinearCustomerRequestManager } from '@/lib/linear'

export const runtime = 'edge';

const emailSchema = z.object({
  customerEmail: z.string().email('Valid email is required'),
})

const fullFormSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email('Valid email is required'),
  externalId: z.string().optional(),
  issueTitle: z.string().min(1, 'Issue title is required'),
  issueBody: z.string().min(1, 'Issue description is required'),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
})

type EmailFormData = z.infer<typeof emailSchema>
type FullFormData = z.infer<typeof fullFormSchema>

export default function PublicFormPage() {
  const params = useParams()
  const slug = params.slug as string

  const [formConfig, setFormConfig] = useState<CustomerRequestForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checkingCustomer, setCheckingCustomer] = useState(false)
  const [step, setStep] = useState<'email' | 'form'>('email')
  const [existingCustomer, setExistingCustomer] = useState<{ id: string; name: string; email: string } | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: {
      customer?: { id: string }
      request?: { id: string }
    }
  } | null>(null)

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      customerEmail: '',
    },
  })

  const fullForm = useForm<FullFormData>({
    resolver: zodResolver(fullFormSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      externalId: '',
      issueTitle: '',
      issueBody: '',
      attachmentUrl: '',
    },
  })

  const loadFormConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customer_request_forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error loading form config:', error)
      } else {
        setFormConfig(data)
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

  const checkCustomer = async (email: string) => {
    if (!formConfig) return

    setCheckingCustomer(true)

    try {
      // Get the user's encrypted Linear token
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('linear_api_token')
        .eq('id', formConfig.user_id)
        .single()

      if (profileError || !profile?.linear_api_token) {
        console.error('Error loading profile:', profileError)
        return
      }

      // Decrypt the token
      let linearToken: string
      try {
        linearToken = decryptToken(profile.linear_api_token)
      } catch (error) {
        console.error('Error decrypting token:', error)
        return
      }

      // Check if customer exists
      const response = await fetch('/api/linear/customer-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: linearToken, email })
      })

      if (response.ok) {
        const data = await response.json() as {
          success: boolean
          exists: boolean
          customer?: { id: string; name: string; email: string }
        }

        if (data.success) {
          setExistingCustomer(data.customer || null)

          // Always reset the form first to clear any previous data
          fullForm.reset({
            customerEmail: email,
            customerName: '',
            externalId: '',
            issueTitle: '',
            issueBody: '',
            attachmentUrl: '',
          })

          // Pre-fill the full form with email and customer name if exists
          fullForm.setValue('customerEmail', email)
          if (data.customer) {
            fullForm.setValue('customerName', data.customer.name)
          }

          setStep('form')
        }
      }
    } catch (error) {
      console.error('Error checking customer:', error)

      // If there's an error, treat as new customer and clear existing state
      setExistingCustomer(null)
      fullForm.reset({
        customerEmail: email,
        customerName: '',
        externalId: '',
        issueTitle: '',
        issueBody: '',
        attachmentUrl: '',
      })
      setStep('form')
    } finally {
      setCheckingCustomer(false)
    }
  }

  const onEmailSubmit = async (values: EmailFormData) => {
    await checkCustomer(values.customerEmail)
  }

  const onFullFormSubmit = async (values: FullFormData) => {
    if (!formConfig) return

    // Validate that we have a customer name if no existing customer
    if (!existingCustomer && (!values.customerName || values.customerName.trim() === '')) {
      setResult({
        success: false,
        message: 'Please enter your name.',
      })
      return
    }

    setSubmitting(true)
    setResult(null)

    try {
      // Get the user's encrypted Linear token
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('linear_api_token')
        .eq('id', formConfig.user_id)
        .single()

      if (profileError || !profile?.linear_api_token) {
        setResult({
          success: false,
          message: 'Form configuration error. Please contact the form owner.',
        })
        return
      }

      // Decrypt the token
      let linearToken: string
      try {
        linearToken = decryptToken(profile.linear_api_token)
      } catch (error) {
        console.error('Error decrypting token:', error)
        setResult({
          success: false,
          message: 'Form configuration error. Please contact the form owner.',
        })
        return
      }

      // Create the Linear request
      const linearManager = new LinearCustomerRequestManager(linearToken)

      const customerData = {
        name: existingCustomer ? existingCustomer.name : values.customerName || 'Customer',
        email: values.customerEmail,
        ...(values.externalId && { externalId: values.externalId }),
      }

      const requestData = {
        title: values.issueTitle,
        body: values.issueBody,
        ...(values.attachmentUrl && { attachmentUrl: values.attachmentUrl }),
      }

      const response = await linearManager.createRequestWithCustomer(
        customerData,
        requestData,
        formConfig.project_id
      )

      if (response.success) {
        setResult({
          success: true,
          message: 'Your request has been submitted successfully! We\'ll get back to you soon.',
          data: {
            customer: response.customer,
            request: response.request
          }
        })
        // Reset forms and go back to email step
        emailForm.reset()
        fullForm.reset()
        setStep('email')
        setExistingCustomer(null)
      } else {
        setResult({
          success: false,
          message: `Failed to submit request: ${response.error || 'Unknown error'}`,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const goBackToEmail = () => {
    setStep('email')
    setExistingCustomer(null)
    setResult(null)

    // Clear the full form to remove any pre-filled data
    fullForm.reset({
      customerEmail: '',
      customerName: '',
      externalId: '',
      issueTitle: '',
      issueBody: '',
      attachmentUrl: '',
    })
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>{formConfig.form_title}</CardTitle>
            {formConfig.description && (
              <CardDescription>{formConfig.description}</CardDescription>
            )}
            <div className="text-sm text-gray-600">
              Project: {formConfig.project_name}
            </div>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                  <FormField
                    control={emailForm.control}
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

                  <Button type="submit" disabled={checkingCustomer} className="w-full">
                    {checkingCustomer ? 'Continuing...' : 'Continue'}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    {existingCustomer ? (
                      <div className="text-sm">
                        <p className="text-green-600 font-medium">Welcome back, {existingCustomer.name}!</p>
                        <p className="text-gray-600">{existingCustomer.email}</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="text-blue-600 font-medium">Customer information</p>
                        <p className="text-gray-600">{fullForm.watch('customerEmail')}</p>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={goBackToEmail}>
                    Change email
                  </Button>
                </div>

                <Form {...fullForm}>
                  <form onSubmit={fullForm.handleSubmit(onFullFormSubmit)} className="space-y-6">
                    {!existingCustomer && (
                      <FormField
                        control={fullForm.control}
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
                    )}

                    <FormField
                      control={fullForm.control}
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
                      control={fullForm.control}
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
                      control={fullForm.control}
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
                      control={fullForm.control}
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
              </div>
            )}

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

        <div className="text-center mt-6 text-sm text-gray-500">
          Powered by Linear Integration
        </div>
      </div>
    </div>
  )
}