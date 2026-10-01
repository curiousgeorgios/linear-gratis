'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n/client'

type TokenRecord = {
  id: string
  name: string
  token_prefix: string
  last_used_at: string | null
  created_at: string
}

function CopyBlock({ value, label }: { value: string; label: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied; the text stays selectable.
    }
  }

  return (
    <div className="relative rounded-md border border-border/60 bg-muted/40">
      <pre
        dir="ltr"
        className="overflow-x-auto p-3 pe-12 text-start text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
      >
        {value}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={copy}
        className="absolute end-1 top-1 h-7 w-7"
        title={t('Copy {label}', { label })}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="sr-only">{t('Copy {label}', { label })}</span>
      </Button>
    </div>
  )
}

export function McpTokensCard() {
  const { t, intlLocale } = useI18n()
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/tokens')
      if (response.ok) {
        const data = (await response.json()) as { tokens?: TokenRecord[] }
        setTokens(data.tokens ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createToken = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = (await response.json()) as { token?: string; error?: string }
      if (!response.ok || !data.token) {
        setError(data.error ?? t('Failed to create token. Please try again.'))
        return
      }
      setNewToken(data.token)
      setName('')
      await load()
    } catch {
      setError(t('Failed to create token. Please try again.'))
    } finally {
      setCreating(false)
    }
  }

  const revokeToken = async (id: string) => {
    setError(null)
    const response = await fetch('/api/tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!response.ok) {
      setError(t('Failed to revoke token. Please try again.'))
      return
    }
    await load()
  }

  const endpoint = `${origin || 'https://your-host'}/api/mcp`
  const secret = newToken ?? 'lgk_your_token'
  const cliCommand = `claude mcp add --transport http linear-gratis ${endpoint} \\\n  --header "Authorization: Bearer ${secret}"`
  const jsonConfig = JSON.stringify(
    {
      mcpServers: {
        'linear-gratis': {
          type: 'http',
          url: endpoint,
          headers: { Authorization: `Bearer ${secret}` },
        },
      },
    },
    null,
    2,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          {t('MCP access for Claude Code')}
        </CardTitle>
        <CardDescription>
          {t('Let Claude Code and other MCP clients work with your Linear workspace through this server. Works the same on self-hosted installs.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={createToken} className="space-y-2">
          <Label htmlFor="mcp-token-name">{t('Token name')}</Label>
          <div className="flex gap-2">
            <Input
              id="mcp-token-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t('For example: Claude Code on my laptop')}
            />
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? t('Creating...') : t('Create token')}
            </Button>
          </div>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800/30 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        {newToken && (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-medium">{t('Copy your new token now. It will not be shown again.')}</p>
            <CopyBlock value={newToken} label={t('token')} />
            <p className="text-sm font-medium">{t('Add it to Claude Code')}</p>
            <CopyBlock value={cliCommand} label={t('command')} />
            <p className="text-xs text-muted-foreground">{t('Or add this to your project .mcp.json:')}</p>
            <CopyBlock value={jsonConfig} label={t('configuration')} />
            <Button type="button" variant="outline" size="sm" onClick={() => setNewToken(null)}>
              {t("I've saved it")}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('Active tokens')}</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('Loading...')}</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('No tokens yet.')}</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-md border border-border/60">
              {tokens.map((token) => (
                <li key={token.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{token.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span dir="ltr" className="font-mono">{token.token_prefix}…</span>
                      {' · '}
                      {token.last_used_at
                        ? t('Last used {date}', { date: new Date(token.last_used_at).toLocaleDateString(intlLocale) })
                        : t('Never used')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeToken(token.id)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    title={t('Revoke token')}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t('Revoke token')}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
