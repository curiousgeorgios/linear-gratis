import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type RequestBody = {
  apiToken: string
  customerData: {
    name: string
    email: string
    externalId?: string
    avatarUrl?: string
  }
  requestData: {
    title: string
    body: string
    attachmentUrl?: string
    attachmentId?: string
    commentId?: string
  }
  projectId: string
}

export async function POST(request: NextRequest) {
  try {
    const { apiToken, customerData, requestData, projectId } = await request.json() as RequestBody;

    if (!apiToken || !customerData || !requestData || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: apiToken, customerData, requestData, projectId' },
        { status: 400 }
      );
    }

    // Create customer need using direct GraphQL request
    const customerNeedInput = {
      customerExternalId: customerData.externalId || customerData.email,
      projectId: projectId,
      body: `${requestData.title}\n\n${requestData.body}`,
      ...(requestData.attachmentUrl && { attachmentUrl: requestData.attachmentUrl }),
      ...(requestData.attachmentId && { attachmentId: requestData.attachmentId }),
      ...(requestData.commentId && { commentId: requestData.commentId })
    };

    const mutation = `
      mutation CustomerNeedCreate($input: CustomerNeedCreateInput!) {
        customerNeedCreate(input: $input) {
          success
          need {
            id
            body
            customer {
              id
              name
              externalIds
            }
            createdAt
            updatedAt
          }
        }
      }
    `;

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken.replace(/[^\x00-\xFF]/g, '')}`
      },
      body: JSON.stringify({
        query: mutation,
        variables: { input: customerNeedInput }
      })
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as {
      data?: {
        customerNeedCreate: {
          success: boolean
          need: {
            id: string
            body: string
            customer: {
              id: string
              name: string
              externalIds: string[]
            }
            createdAt: string
            updatedAt: string
          }
        }
      }
      errors?: Array<{ message: string }>
    };

    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    if (!result.data) {
      throw new Error('No data returned from Linear API');
    }

    if (!result.data.customerNeedCreate.success) {
      throw new Error('Failed to create customer request');
    }

    const customerRequest = result.data.customerNeedCreate.need;

    return NextResponse.json({
      success: true,
      customer: customerRequest.customer,
      request: {
        id: customerRequest.id,
        body: customerRequest.body,
        createdAt: customerRequest.createdAt,
        updatedAt: customerRequest.updatedAt
      }
    });

  } catch (error) {
    console.error('Linear API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}