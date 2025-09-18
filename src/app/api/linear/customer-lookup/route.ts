import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { apiToken, email } = await request.json() as { apiToken: string; email: string };

    if (!apiToken || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: apiToken, email' },
        { status: 400 }
      );
    }

    // Get recent customer needs and search through them for the email using direct GraphQL
    const query = `
      query CustomerNeeds {
        customerNeeds(first: 50) {
          nodes {
            id
            customer {
              id
              name
              externalIds
            }
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
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as {
      data?: {
        customerNeeds: {
          nodes: Array<{
            id: string
            customer: {
              id: string
              name: string
              externalIds: string[]
            }
          }>
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

    try {
      // Search through customer needs to find one with matching external ID
      for (const need of result.data.customerNeeds.nodes) {
        const customer = need.customer;
        if (customer && customer.externalIds.includes(email)) {
          return NextResponse.json({
            success: true,
            exists: true,
            customer: {
              id: customer.id,
              name: customer.name,
              email: email
            }
          });
        }
      }

      // No existing customer found
      return NextResponse.json({
        success: true,
        exists: false,
        customer: null
      });

    } catch (searchError) {
      console.log('Customer search failed, treating as new customer:', searchError);

      // If search fails, treat as new customer to keep the flow working
      return NextResponse.json({
        success: true,
        exists: false,
        customer: null
      });
    }

  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json(
      {
        success: true,
        exists: false,
        customer: null
      },
      { status: 200 }
    );
  }
}