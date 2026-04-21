'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const [linearToken, setLinearToken] = useState('')
  const [hasLinearToken, setHasLinearToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const loadProfile = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch('/api/profile/linear-token', {
        method: 'GET',
      })

      if (!response.ok) {
        console.error('Error loading profile status:', response.status)
        return
      }

      const data = (await response.json()) as { hasToken?: boolean }
      setHasLinearToken(Boolean(data.hasToken))
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return // Wait for auth to finish loading

    if (!user) {
      router.push('/login')
      return
    }

    // Load existing token status
    loadProfile()
  }, [user, authLoading, router, loadProfile])

  const saveProfile = async () => {
    if (!user) return

    if (!linearToken.trim()) {
      setMessage({ type: 'error', text: 'Enter a Linear API token to save.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/linear-token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: linearToken.trim() }),
      })

      if (!response.ok) {
        setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' })
        console.error('Error saving profile:', response.status)
      } else {
        setMessage({ type: 'success', text: 'Profile saved successfully!' })
        setHasLinearToken(true)
        setLinearToken('')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' })
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const clearToken = async () => {
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/linear-token', {
        method: 'DELETE',
      })

      if (!response.ok) {
        setMessage({ type: 'error', text: 'Failed to remove token. Please try again.' })
      } else {
        setMessage({ type: 'success', text: 'Linear token removed.' })
        setHasLinearToken(false)
        setLinearToken('')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove token. Please try again.' })
      console.error('Error clearing token:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        </div>
      </div>
    )
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
              Connect your Linear workspace to start collecting customer feedback directly in your issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && (
              <div className="text-center py-4">
                <p className="text-gray-600">Loading profile...</p>
              </div>
            )}

            {!loading && (
              <>
                {/* Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <h3 className="font-semibold mb-3">How to get your Linear API token:</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>
                      <span className="font-medium">Open Linear</span> and go to{' '}
                      <span className="bg-muted px-2 py-1 rounded text-xs font-mono">Settings → API</span>
                    </li>
                    <li>
                      <span className="font-medium">Click &quot;Create personal API key&quot;</span>
                    </li>
                    <li>
                      <span className="font-medium">Give it a name</span> like &quot;Linear Integration&quot; or &quot;Customer Feedback&quot;
                    </li>
                    <li>
                      <span className="font-medium">Copy the generated token</span> and paste it below
                    </li>
                  </ol>
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded text-xs text-yellow-800 dark:text-yellow-400">
                    <strong>Important:</strong> Keep this token secure. It provides access to your Linear workspace.
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="linear-token">Linear API token</Label>
                    <Input
                      id="linear-token"
                      type="password"
                      placeholder={hasLinearToken ? "Token is configured (enter a new one to replace it)" : "Paste your Linear API token here"}
                      value={linearToken}
                      onChange={(e) => setLinearToken(e.target.value)}
                      autoComplete="current-password"
                    />
                    <p className="text-sm text-muted-foreground">
                      This token will be encrypted and stored securely. It&apos;s used to create customer requests in your Linear workspace.
                    </p>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-lg text-sm ${
                      message.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800/30 dark:text-green-400'
                        : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800/30 dark:text-red-400'
                    }`}>
                      {message.text}
                      {message.type === 'success' && (
                        <div className="mt-2">
                          <Button variant="link" className="h-auto p-0 text-sm" onClick={() => router.push('/')}>
                            → Go to Linear integration
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={saving || !linearToken.trim()}
                      className="flex-1"
                    >
                      {saving ? 'Saving token...' : hasLinearToken ? 'Replace Linear token' : 'Save Linear token'}
                    </Button>
                    {hasLinearToken && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearToken}
                        disabled={saving}
                      >
                        Remove token
                      </Button>
                    )}
                  </div>
                </form>
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
