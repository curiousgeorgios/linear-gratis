'use client'

import { useState, Suspense } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import { getAuthMethods } from '@/lib/auth-methods'
import { LanguageToggle } from '@/components/language-toggle'

function LoginForm() {
  const t = useT()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const { signInWithMagicLink, signInWithGitHub, signInWithPassword, signUpWithPassword } = useAuth()
  const router = useRouter()
  const methods = getAuthMethods()
  const [password, setPassword] = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signInWithMagicLink(email)

    if (error) {
      console.error('Error sending magic link:', error)
      alert(t("Error sending magic link. Please try again."))
    } else {
      setMagicLinkSent(true)
    }

    setLoading(false)
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPasswordError(null)

    if (creatingAccount) {
      const { error, needsConfirmation } = await signUpWithPassword(email, password)
      if (error) {
        setPasswordError(error.message || t("Could not create the account. Please try again."))
      } else if (needsConfirmation) {
        setMagicLinkSent(true)
      } else {
        router.push('/profile')
      }
    } else {
      const { error } = await signInWithPassword(email, password)
      if (error) {
        setPasswordError(t("Incorrect email or password."))
      } else {
        router.push('/profile')
      }
    }

    setLoading(false)
  }

  const handleGitHubLogin = async () => {
    setLoading(true)
    const { error } = await signInWithGitHub()
    if (error) {
      console.error('Error signing in with GitHub:', error)
      alert(t("Error signing in with GitHub. Please try again."))
    }
    setLoading(false)
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle><h1>{t("Check your email")}</h1></CardTitle>
            <CardDescription>
              {t("We've sent a magic link to {email}. Click the link in the email to sign in.", { email })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setMagicLinkSent(false)}
              className="w-full"
            >
              {t("Try different email")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle><h1>{t("Sign in to your account")}</h1></CardTitle>
          <CardDescription>
            {t("Choose your preferred sign-in method to access your Linear integration")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
              {error === 'auth_callback_failed' && t("Authentication failed. Please try again.")}
            </div>
          )}

          {methods.includes('github') && (
            <Button
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? t("Signing in...") : t("Continue with GitHub")}
            </Button>
          )}

          {methods.includes('github') && (methods.includes('magic_link') || methods.includes('password')) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("Or")}</span>
              </div>
            </div>
          )}

          {methods.includes('password') && (
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("Email address")}</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder={t("Enter your email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("Password")}</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  placeholder={t("Enter your password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={creatingAccount ? 'new-password' : 'current-password'}
                  minLength={creatingAccount ? 8 : undefined}
                  required
                />
                {creatingAccount && (
                  <p className="text-xs text-muted-foreground">{t("Use at least 8 characters.")}</p>
                )}
              </div>
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800/30 dark:text-red-400 p-3 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}
              <Button type="submit" disabled={loading || !email || !password} className="w-full">
                {loading
                  ? t("Signing in...")
                  : creatingAccount
                    ? t("Create account")
                    : t("Sign in")}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full h-auto p-0 text-sm"
                onClick={() => {
                  setCreatingAccount(!creatingAccount)
                  setPasswordError(null)
                }}
              >
                {creatingAccount ? t("Already have an account? Sign in") : t("New here? Create an account")}
              </Button>
            </form>
          )}

          {methods.includes('password') && methods.includes('magic_link') && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("Or")}</span>
              </div>
            </div>
          )}

          {methods.includes('magic_link') && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              {!methods.includes('password') && (
                <div className="space-y-2">
                  <Label htmlFor="email">{t("Email address")}</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    placeholder={t("Enter your email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full"
                variant={methods.includes('password') ? 'outline' : 'default'}
              >
                {loading ? t("Sending...") : t("Send magic link")}
              </Button>
            </form>
          )}

          <div className="flex justify-center pt-2">
            <LanguageToggle className="font-medium text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  const t = useT()

  return (
    <Suspense fallback={<div>{t("Loading...")}</div>}>
      <LoginForm />
    </Suspense>
  )
}
