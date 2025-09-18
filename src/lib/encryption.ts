import CryptoJS from 'crypto-js'

// Only validate encryption key on server-side
const ENCRYPTION_KEY = typeof window === 'undefined' ? process.env.ENCRYPTION_KEY : null

if (typeof window === 'undefined' && !ENCRYPTION_KEY) {
  throw new Error(
    'ENCRYPTION_KEY environment variable is required. ' +
    'Generate one with: openssl rand -base64 32'
  )
}

export function encryptToken(token: string): string {
  if (!token) return ''

  // Only allow encryption on server-side
  if (typeof window !== 'undefined') {
    throw new Error('Encryption can only be performed on the server-side')
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not available')
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString()
    return encrypted
  } catch (error) {
    console.error('Error encrypting token:', error)
    throw new Error('Failed to encrypt token')
  }
}

export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) return ''

  // Only allow decryption on server-side
  if (typeof window !== 'undefined') {
    throw new Error('Decryption can only be performed on the server-side')
  }

  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not available')
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted
  } catch (error) {
    console.error('Error decrypting token:', error)
    throw new Error('Failed to decrypt token')
  }
}