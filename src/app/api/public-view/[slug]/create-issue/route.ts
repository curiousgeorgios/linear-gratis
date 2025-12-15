import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';

export const runtime = 'edge';

interface IssueCreateRequest {
  title: string;
  description?: string;
  stateId?: string;
  priority?: number;
  assigneeId?: string;
  labelIds?: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const issueData: IssueCreateRequest = await request.json();

    // Get the public view
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('public_views')
      .select('*')
      .eq('slug', slug)
      .single();

    if (viewError || !viewData) {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      );
    }

    // Check if issue creation is allowed
    if (!viewData.allow_issue_creation) {
      return NextResponse.json(
        { error: 'Issue creation is not allowed for this view' },
        { status: 403 }
      );
    }

    // Get the user's Linear token
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', viewData.user_id)
      .single();

    if (profileError || !profileData?.linear_api_token) {
      return NextResponse.json(
        { error: 'Unable to create issue - Linear API token not found' },
        { status: 500 }
      );
    }

    // Decrypt the token
    const decryptedToken = decryptToken(profileData.linear_api_token);

    // Fetch team metadata to get triage settings
    // This enforces that public issues always use triage/unstarted state
    const metadataResponse = await fetch(`${request.nextUrl.origin}/api/linear/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiToken: decryptedToken,
        teamId: viewData.team_id,
        projectId: viewData.project_id,
      })
    });

    interface WorkflowState {
      id: string;
      name: string;
      type: string;
      color: string;
    }

    interface MetadataResult {
      success: boolean;
      metadata?: {
        triageEnabled?: boolean;
        triageIssueState?: WorkflowState;
        states?: WorkflowState[];
      };
    }

    const metadataResult: MetadataResult = await metadataResponse.json();

    // Determine the correct state for public issue creation
    // Priority: 1) Triage state if enabled, 2) First unstarted state, 3) First available state
    let finalStateId: string | undefined = undefined;

    if (metadataResult.metadata?.triageEnabled && metadataResult.metadata?.triageIssueState) {
      // Force triage state when triage is enabled
      finalStateId = metadataResult.metadata.triageIssueState.id;
    } else if (metadataResult.metadata?.states) {
      // Fall back to unstarted state
      const unstartedState = metadataResult.metadata.states.find(
        (s: WorkflowState) => s.type === 'unstarted'
      );
      if (unstartedState) {
        finalStateId = unstartedState.id;
      } else if (metadataResult.metadata.states.length > 0) {
        // Last resort: use first available state
        finalStateId = metadataResult.metadata.states[0].id;
      }
    }

    // Create the issue with enforced restrictions
    // Note: priority and assigneeId are intentionally not passed for public views
    const createIssueResponse = await fetch(`${request.nextUrl.origin}/api/linear/create-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiToken: decryptedToken,
        title: issueData.title,
        description: issueData.description,
        stateId: finalStateId, // Enforced triage/unstarted state
        priority: 0, // Default to no priority for public views
        assigneeId: undefined, // No assignee for public views
        projectId: viewData.project_id,
        teamId: viewData.team_id,
        labelIds: issueData.labelIds,
      })
    });

    if (!createIssueResponse.ok) {
      throw new Error('Failed to create issue');
    }

    const result = await createIssueResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}