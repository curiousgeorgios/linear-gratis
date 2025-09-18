import { NextRequest, NextResponse } from 'next/server';
import { encryptToken } from '@/lib/encryption';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json() as { token: string };

    if (!token) {
      return NextResponse.json(
        { error: 'Missing required field: token' },
        { status: 400 }
      );
    }

    const encryptedToken = encryptToken(token);

    return NextResponse.json({
      success: true,
      encryptedToken: encryptedToken
    });

  } catch (error) {
    console.error('Encryption API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}