import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/lib/encryption'

interface RouteContext {
  params: Promise<{
    slug: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params

    // Get the view from the database
    const { data: view, error: viewError } = await supabaseAdmin
      .from('public_views')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (viewError || !view) {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      )
    }

    // Check if this view has a project
    if (!view.project_id) {
      return NextResponse.json(
        { error: 'This view is not associated with a project' },
        { status: 400 }
      )
    }

    // Get the user's Linear API token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', view.user_id)
      .single()

    if (profileError || !profile?.linear_api_token) {
      return NextResponse.json(
        { error: 'Linear API token not found' },
        { status: 500 }
      )
    }

    // Decrypt the Linear API token
    const decryptedToken = decryptToken(profile.linear_api_token)

    // Fetch project updates from Linear
    const query = `
      query ProjectUpdates($projectId: String!) {
        project(id: $projectId) {
          id
          name
          progress
          state
          projectUpdates(first: 50) {
            nodes {
              id
              body
              createdAt
              editedAt
              health
              user {
                id
                name
                displayName
                avatarUrl
                email
              }
              diffMarkdown
              isDiffHidden
              project {
                id
                name
                progress
                state
              }
            }
          }
        }
      }
    `

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': decryptedToken.trim()
      },
      body: JSON.stringify({
        query,
        variables: { projectId: view.project_id }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Linear API error response:', errorText)
      throw new Error(`Linear API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json() as {
      data?: {
        project: {
          id: string
          name: string
          progress: number
          state: string
          projectUpdates: {
            nodes: Array<{
              id: string
              body: string
              createdAt: string
              editedAt?: string
              health: string
              user: {
                id: string
                name: string
                displayName: string
                avatarUrl?: string
                email: string
              }
              diffMarkdown?: string
              isDiffHidden: boolean
              project: {
                id: string
                name: string
                progress: number
                state: string
              }
            }>
          }
        }
      }
      errors?: Array<{ message: string }>
    }

    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`)
    }

    if (!result.data) {
      throw new Error('No data returned from Linear API')
    }

    return NextResponse.json({
      success: true,
      project: result.data.project,
      updates: result.data.project.projectUpdates.nodes
    })

  } catch (error) {
    console.error('Project updates API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
