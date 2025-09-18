/**
 * Client-side encryption utilities that make API calls to server-side endpoints
 */

export async function encryptTokenClient(token: string): Promise<string> {
  if (!token) return '';

  try {
    const response = await fetch('/api/encrypt-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json() as {
      success: boolean
      encryptedToken?: string
      error?: string
    };

    if (!data.success) {
      throw new Error(data.error || 'Failed to encrypt token');
    }

    return data.encryptedToken || '';
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw error;
  }
}

export async function decryptTokenClient(encryptedToken: string): Promise<string> {
  if (!encryptedToken) return '';

  try {
    const response = await fetch('/api/decrypt-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ encryptedToken })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json() as {
      success: boolean
      token?: string
      error?: string
    };

    if (!data.success) {
      throw new Error(data.error || 'Failed to decrypt token');
    }

    return data.token || '';
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw error;
  }
}