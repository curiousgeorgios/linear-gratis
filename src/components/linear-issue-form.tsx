"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

const formSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  externalId: z.string().optional(),
  issueTitle: z.string().min(1, "Issue title is required"),
  issueBody: z.string().min(1, "Issue description is required"),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
})

type FormData = z.infer<typeof formSchema>

type Project = {
  id: string
  name: string
  description?: string
}

export function LinearIssueForm() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [hasLinearToken, setHasLinearToken] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: {
      customer?: { id: string }
      request?: { id: string }
    }
  } | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "",
      customerName: "",
      customerEmail: "",
      externalId: "",
      issueTitle: "",
      issueBody: "",
      attachmentUrl: "",
    },
  })

  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const response = await fetch('/api/linear/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json() as { projects?: Project[] }
        setProjects(data.projects || [])
      } else {
        setProjects([])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  // Check whether the user has a Linear token configured (never loads the
  // token itself) and, if so, populate the project picker.
  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      setLoadingProfile(true)
      try {
        const response = await fetch('/api/profile/linear-token', {
          method: 'GET',
        })

        if (response.ok) {
          const data = (await response.json()) as { hasToken?: boolean }
          const tokenConfigured = Boolean(data.hasToken)
          setHasLinearToken(tokenConfigured)
          if (tokenConfigured) {
            await fetchProjects()
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [user, fetchProjects])

  async function onSubmit(values: FormData) {
    setIsSubmitting(true)
    setResult(null)

    try {
      const customerData = {
        name: values.customerName,
        email: values.customerEmail,
        ...(values.externalId && { externalId: values.externalId }),
      }

      const requestData = {
        title: values.issueTitle,
        body: values.issueBody,
        ...(values.attachmentUrl && { attachmentUrl: values.attachmentUrl }),
      }

      const response = await fetch('/api/linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerData,
          requestData,
          projectId: values.projectId,
        }),
      })

      const data = (await response.json()) as {
        success?: boolean
        customer?: { id: string }
        request?: { id: string }
        error?: string
      }

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `Successfully created customer request!`,
          data: {
            customer: data.customer,
            request: data.request,
          },
        })
        form.reset()
      } else {
        setResult({
          success: false,
          message: `Failed to create request: ${data.error || 'Unknown error'}`,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingProfile) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Create Linear customer request</CardTitle>
          <CardDescription>
            Loading your profile...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Checking your Linear configuration...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasLinearToken) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Create Linear customer request</CardTitle>
          <CardDescription>
            Connect a Linear workspace before you can submit customer requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              You haven&apos;t configured a Linear API token yet.
            </p>
            <Button asChild>
              <Link href="/profile">Add Linear API token</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Create Linear customer request</CardTitle>
        <CardDescription>
          Submit a customer request to Linear. If the customer doesn&apos;t exist, they&apos;ll be created automatically.
        </CardDescription>
      </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingProjects || projects.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isLoadingProjects
                              ? "Loading projects..."
                              : projects.length === 0
                                ? "No projects available"
                                : "Select a project"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Using your saved Linear token. <Link href="/profile" className="text-primary hover:underline">Manage in profile</Link>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer name</FormLabel>
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
                      <FormLabel>Customer email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
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
                    <FormLabel>External ID (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="customer_123" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your internal customer ID for reference
                    </FormDescription>
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
                      <Input placeholder="Feature request: Dark mode support" {...field} />
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
                    <FormLabel>Issue description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issue or feature request in detail..."
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
                    <FormDescription>
                      Link to any relevant files or screenshots
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="w-full h-11 font-medium">
                {isSubmitting ? "Creating request..." : "Create customer request"}
              </Button>
            </form>
          </Form>

          {result && (
            <div className={`mt-6 p-4 rounded-lg border ${
              result.success
                ? "bg-green-50/80 border-green-200/50 text-green-800 dark:bg-green-950/20 dark:border-green-800/30 dark:text-green-400"
                : "bg-red-50/80 border-red-200/50 text-red-800 dark:bg-red-950/20 dark:border-red-800/30 dark:text-red-400"
            }`}>
              <p className="font-semibold">
                {result.success ? "Success!" : "Error"}
              </p>
              <p className="text-sm mt-1 opacity-90">{result.message}</p>
              {result.success && result.data && (
                <div className="mt-3 text-xs opacity-80 space-y-1">
                  <p><span className="font-medium">Customer ID:</span> {result.data.customer?.id}</p>
                  <p><span className="font-medium">Request ID:</span> {result.data.request?.id}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
  )
}
