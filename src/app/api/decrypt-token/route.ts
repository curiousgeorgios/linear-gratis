import { NextRequest, NextResponse } from 'next/server';
import { decryptToken } from '@/lib/encryption';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { encryptedToken } = await request.json() as { encryptedToken: string };

    if (!encryptedToken) {
      return NextResponse.json(
        { error: 'Missing required field: encryptedToken' },
        { status: 400 }
      );
    }

    const decryptedToken = decryptToken(encryptedToken);

    return NextResponse.json({
      success: true,
      token: decryptedToken
    });

  } catch (error) {
    console.error('Decryption API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}