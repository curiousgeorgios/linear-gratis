'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { encryptTokenClient, decryptTokenClient } from '@/lib/client-encryption'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [linearToken, setLinearToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const loadProfile = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('linear_api_token')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading profile:', error)
      } else if (data?.linear_api_token) {
        try {
          const decryptedToken = await decryptTokenClient(data.linear_api_token)
          setLinearToken(decryptedToken)
        } catch (error) {
          console.error('Error decrypting token:', error)
          setMessage({ type: 'error', text: 'Error loading saved token. Please re-enter your token.' })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Load existing token
    loadProfile()
  }, [user, router, loadProfile])

  const saveProfile = async () => {
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      let encryptedToken = null
      if (linearToken) {
        try {
          encryptedToken = await encryptTokenClient(linearToken)
        } catch (error) {
          setMessage({ type: 'error', text: 'Failed to encrypt token. Please try again.' })
          console.error('Error encrypting token:', error)
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          linear_api_token: encryptedToken,
          updated_at: new Date().toISOString()
        })

      if (error) {
        setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' })
        console.error('Error saving profile:', error)
      } else {
        setMessage({ type: 'success', text: 'Profile saved successfully!' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' })
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Profile settings</h1>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account information</CardTitle>
            <CardDescription>
              Your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input value={user.email || ''} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linear integration</CardTitle>
            <CardDescription>
              Save your Linear API token to avoid entering it each time. Get your token from Linear Settings → API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="text-center py-4">
                <p className="text-gray-600">Loading profile...</p>
              </div>
            )}

            {!loading && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="linear-token">Linear API token</Label>
                  <Input
                    id="linear-token"
                    type="password"
                    placeholder="Enter your Linear API token"
                    value={linearToken}
                    onChange={(e) => setLinearToken(e.target.value)}
                  />
                  <p className="text-sm text-gray-600">
                    This token will be stored securely and used for creating customer requests.
                  </p>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}

                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Save profile'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="link" onClick={() => router.push('/')}>
            ← Back to Linear integration
          </Button>
        </div>
      </div>
    </div>
  )
}