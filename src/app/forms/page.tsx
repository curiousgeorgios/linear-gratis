'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Navigation } from '@/components/navigation'
import { supabase, CustomerRequestForm } from '@/lib/supabase'
import { decryptTokenClient } from '@/lib/client-encryption'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, Eye, Copy } from 'lucide-react'

type Project = {
  id: string
  name: string
  description?: string
}

export default function FormsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [forms, setForms] = useState<CustomerRequestForm[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [linearToken, setLinearToken] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')

  const loadUserData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      // Load user profile and forms in parallel
      const [profileResult, formsResult] = await Promise.all([
        supabase.from('profiles').select('linear_api_token').eq('id', user.id).single(),
        supabase.from('customer_request_forms').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])

      // Handle profile
      if (profileResult.data?.linear_api_token) {
        try {
          const decryptedToken = await decryptTokenClient(profileResult.data.linear_api_token)
          setLinearToken(decryptedToken)
          await fetchProjects(decryptedToken)
        } catch (error) {
          console.error('Error decrypting token:', error)
        }
      }

      // Handle forms
      if (formsResult.error) {
        console.error('Error loading forms:', formsResult.error)
      } else {
        setForms(formsResult.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadUserData()
  }, [user, router, loadUserData])

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch('/api/linear/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: token })
      })

      if (response.ok) {
        const data = await response.json() as { projects?: Project[] }
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (value: string) => {
    setFormName(value)
    if (!formSlug || formSlug === generateSlug(formName)) {
      setFormSlug(generateSlug(value))
    }
  }

  const createForm = async () => {
    if (!user || !linearToken) return

    setSubmitting(true)
    setMessage(null)

    try {
      const selectedProjectData = projects.find(p => p.id === selectedProject)
      if (!selectedProjectData) {
        setMessage({ type: 'error', text: 'Please select a project' })
        return
      }

      const { error } = await supabase
        .from('customer_request_forms')
        .insert({
          user_id: user.id,
          name: formName,
          slug: formSlug,
          project_id: selectedProject,
          project_name: selectedProjectData.name,
          form_title: formTitle,
          description: formDescription || null
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setMessage({ type: 'error', text: 'This URL slug is already taken. Please choose a different one.' })
        } else {
          setMessage({ type: 'error', text: 'Failed to create form. Please try again.' })
        }
        console.error('Error creating form:', error)
      } else {
        setMessage({ type: 'success', text: 'Form created successfully!' })
        resetForm()
        await loadUserData()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create form. Please try again.' })
      console.error('Error creating form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('customer_request_forms')
        .delete()
        .eq('id', formId)

      if (error) {
        console.error('Error deleting form:', error)
        alert('Failed to delete form')
      } else {
        await loadUserData()
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Failed to delete form')
    }
  }

  const copyFormLink = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`
    navigator.clipboard.writeText(url)
    setMessage({ type: 'success', text: 'Form link copied to clipboard!' })
    setTimeout(() => setMessage(null), 3000)
  }

  const resetForm = () => {
    setFormName('')
    setFormSlug('')
    setSelectedProject('')
    setFormTitle('')
    setFormDescription('')
    setShowCreateForm(false)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  if (!linearToken) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Linear API token required</CardTitle>
              <CardDescription>
                You need to save your Linear API token before creating forms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile">
                <Button>Go to profile settings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Customer request forms</h1>
            <p className="text-gray-600">Create custom forms for different projects and use cases</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} disabled={projects.length === 0}>
            Create new form
          </Button>
        </div>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {projects.length === 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">
                No projects found. Make sure your Linear API token is valid and you have access to projects.
              </p>
            </CardContent>
          </Card>
        )}

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create new form</CardTitle>
              <CardDescription>
                Set up a custom customer request form with pre-defined project and title
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Form name</Label>
                  <Input
                    id="form-name"
                    placeholder="Support requests"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-slug">URL slug</Label>
                  <Input
                    id="form-slug"
                    placeholder="support-requests"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    This will be accessible at: /form/{formSlug}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Linear project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-title">Form title</Label>
                <Input
                  id="form-title"
                  placeholder="Submit a support request"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-description">Description (optional)</Label>
                <Textarea
                  id="form-description"
                  placeholder="Help us resolve your issue quickly by providing detailed information..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={createForm}
                  disabled={submitting || !formName || !formSlug || !selectedProject || !formTitle}
                >
                  {submitting ? 'Creating...' : 'Create form'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">No forms created yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first customer request form to start collecting submissions.
                </p>
                <Button onClick={() => setShowCreateForm(true)} disabled={projects.length === 0}>
                  Create your first form
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {forms.map((form) => (
              <Card key={form.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{form.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{form.form_title}</p>
                      <p className="text-sm text-gray-500">
                        Project: {form.project_name} • Created {new Date(form.created_at).toLocaleDateString()}
                      </p>
                      {form.description && (
                        <p className="text-sm text-gray-600 mt-2">{form.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        URL: /form/{form.slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyFormLink(form.slug)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Link href={`/form/${form.slug}`} target="_blank">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteForm(form.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}