'use client'

import { useState, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { IssuesView } from '@/components/issues-view'
import { IssueCreationModal } from '@/components/issue-creation-modal'
import { IssueDetailModal } from '@/components/issue-detail-modal'
import { ProjectUpdatesModal } from '@/components/project-updates-modal'
import { PublicView } from '@/lib/supabase'
import { LinearIssue } from '@/app/api/linear/issues/route'
import { RefreshCw, Lock } from 'lucide-react'
import { useBrandingSettings, applyBrandingToPage, getBrandingStyles } from '@/hooks/use-branding'

interface PublicViewPageProps {
  params: Promise<{
    slug: string
    issuePath?: string[]
  }>
}

function getViewPath(slug: string) {
  return `/view/${encodeURIComponent(slug)}`
}

function getIssuePath(slug: string, issueId: string) {
  return `${getViewPath(slug)}/${encodeURIComponent(issueId)}`
}

export default function PublicViewPage({ params }: PublicViewPageProps) {
  const router = useRouter()
  const [view, setView] = useState<PublicView | null>(null)
  const [issues, setIssues] = useState<LinearIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [authenticating, setAuthenticating] = useState(false)
  const [slug, setSlug] = useState<string>('')
  const [routeIssueId, setRouteIssueId] = useState<string | null>(null)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showIssueDetail, setShowIssueDetail] = useState(false)
  const [showProjectUpdates, setShowProjectUpdates] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [defaultStateName, setDefaultStateName] = useState<string | undefined>(undefined)

  // Load branding settings for this view's owner
  const { branding } = useBrandingSettings(
    view?.user_id || null,
    view ? { type: 'view', slug: view.slug } : null,
  )

  useEffect(() => {
    let cancelled = false

    const initParams = async () => {
      const resolvedParams = await params
      if (cancelled) return

      setSlug(resolvedParams.slug)
      setRouteIssueId(resolvedParams.issuePath?.[0] ?? null)
    }
    initParams()

    return () => {
      cancelled = true
    }
  }, [params])

  useEffect(() => {
    setSelectedIssueId(routeIssueId)
    setShowIssueDetail(Boolean(routeIssueId))
  }, [routeIssueId])

  const loadView = async (providedPassword?: string) => {
    if (!slug) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public-view/${slug}`, {
        method: providedPassword ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(providedPassword && { body: JSON.stringify({ password: providedPassword }) })
      })

      const data = await response.json() as { requiresPassword?: boolean; error?: string; view?: unknown; issues?: unknown[] }

      if (!response.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true)
          setView(null)
          setIssues([])
          return
        } else if (response.status === 404) {
          notFound()
          return
        } else {
          setError(data.error || 'Failed to load public view')
          return
        }
      }

      const viewData = data.view as PublicView
      setView(viewData)
      const issuesData = data.issues as LinearIssue[] || []
      setIssues(issuesData)
      setLastUpdated(new Date())
      setRequiresPassword(false)

    } catch (err) {
      console.error('Error loading view:', err)
      setError('Failed to load the public view')
    } finally {
      setLoading(false)
      setAuthenticating(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setAuthenticating(true)
    await loadView(password)
  }

  const handleRefresh = async () => {
    if (!slug) return

    setRefreshing(true)
    try {
      const response = await fetch(`/api/public-view/${slug}`)
      const data = await response.json() as { issues?: LinearIssue[] }

      if (response.ok) {
        const issuesData = data.issues || []
        setIssues(issuesData)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Error refreshing:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleCreateIssue = (columnName?: string) => {
    setDefaultStateName(columnName)
    setShowIssueModal(true)
  }

  const handleIssueClick = (issueId: string) => {
    setSelectedIssueId(issueId)
    setShowIssueDetail(true)
    if (slug && routeIssueId !== issueId) {
      router.push(getIssuePath(slug, issueId))
    }
  }

  const handleCloseIssueDetail = () => {
    setShowIssueDetail(false)
    setSelectedIssueId(null)
    if (slug) {
      router.replace(getViewPath(slug))
    }
  }

  const handleSubmitIssue = async (issueData: {
    title: string;
    description: string;
    stateId?: string;
    priority: number;
    assigneeId?: string;
    projectId?: string;
    teamId?: string;
    labelIds: string[];
    attachmentFiles?: File[];
  }) => {
    const attachmentFiles = issueData.attachmentFiles ?? []
    const hasAttachments = attachmentFiles.length > 0

    const response = await fetch(`/api/public-view/${slug}/create-issue`, hasAttachments
      ? {
          method: 'POST',
          body: (() => {
            const payload = new globalThis.FormData()
            payload.set('title', issueData.title)
            payload.set('description', issueData.description)
            payload.set('labelIds', JSON.stringify(issueData.labelIds))
            attachmentFiles.forEach(file => payload.append('attachmentFiles', file))
            return payload
          })(),
        }
      : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: issueData.title,
            description: issueData.description,
            stateId: issueData.stateId,
            priority: issueData.priority,
            assigneeId: issueData.assigneeId,
            labelIds: issueData.labelIds,
          }),
        })

    const result = await response.json() as { success?: boolean; issue?: unknown; error?: string }

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to create issue')
    }

    // Success - refresh to show the new issue
    await handleRefresh()
  }

  useEffect(() => {
    if (slug) {
      loadView()
    }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply branding when it loads
  useEffect(() => {
    if (branding) {
      applyBrandingToPage(branding, view?.view_title)
    }
  }, [branding, view?.view_title])

  if (loading) {
    return (
      <div className="min-h-screen bg-background linear-gradient-bg flex items-center justify-center">
        <div className="text-center linear-fade-in">
          <div className="w-8 h-8 mx-auto mb-4">
            <svg className="animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading public view...</p>
        </div>
      </div>
    )
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-background linear-gradient-bg flex items-center justify-center">
        <div className="w-full max-w-sm linear-scale-in">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-10 h-10 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-lg font-medium tracking-tight mb-2">Protected view</h1>
              <p className="text-sm text-muted-foreground">
                This view is password protected. Enter the password to continue.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authenticating}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={authenticating || !password.trim()}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {authenticating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 animate-spin">
                      <svg fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    Authenticating...
                  </div>
                ) : (
                  'Access view'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (!view) {
    notFound()
    return null
  }

  return (
    <div className="min-h-screen bg-background linear-gradient-bg flex flex-col" style={getBrandingStyles(branding)}>
      {/* Linear-style Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Left side - Brand logo or team name */}
          <div className="flex items-center gap-3 sm:gap-6 max-w-[50%] min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {branding?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-provided URL, domain not known at build time
                <img
                  src={branding.logo_url}
                  alt={branding.brand_name || 'Logo'}
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxHeight: `${branding.logo_height || 40}px`,
                    objectFit: 'contain',
                  }}
                  className="flex-shrink-0"
                />
              ) : (
                <>
                  <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">👤</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-medium tracking-tight truncate">
                    {branding?.brand_name || view.project_name || view.team_name || 'Public View'}
                  </h2>
                </>
              )}
            </div>

            {/* Navigation tabs - Linear style */}
            <div className="hidden sm:flex items-center gap-1">
              <div className="px-3 py-1.5 rounded-md bg-accent/50 text-sm font-medium text-foreground border border-border/50">
                {view.view_title}
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {lastUpdated && (
              <div className="hidden sm:block text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}

            {view.project_id && view.show_project_updates !== false && (
              <button
                onClick={() => setShowProjectUpdates(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.5 2.5h11v11h-11v-11zM2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm3.5 4a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H6z"/>
                </svg>
                <span className="hidden sm:inline">Updates</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <button className="p-2 hover:bg-accent rounded-md transition-colors" aria-label="Insights">
                <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3 9C3.55228 9 4 9.44772 4 10V13C4 13.5523 3.55228 14 3 14H2C1.44772 14 1 13.5523 1 13V10C1 9.44772 1.44772 9 2 9H3ZM14 6C14.5523 6 15 6.44772 15 7V13C15 13.5523 14.5523 14 14 14H13C12.4477 14 12 13.5523 12 13V7C12 6.44772 12.4477 6 13 6H14ZM8.5 2C9.05229 2 9.5 2.44772 9.5 3V13C9.5 13.5523 9.05229 14 8.5 14H7.5C6.94772 14 6.5 13.5523 6.5 13V3C6.5 2.44772 6.94772 2 7.5 2H8.5Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Content - flex-1 pushes footer to bottom */}
      <div className="flex-1 p-4 sm:p-6">
        {error ? (
          <div className="max-w-md mx-auto mt-20 p-6 bg-destructive/5 border border-destructive/20 rounded-lg linear-scale-in">
            <h3 className="font-medium text-destructive mb-2">Error loading data</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Retrying...' : 'Try again'}
            </button>
          </div>
        ) : (
          <div className="linear-fade-in">
            <IssuesView
              issues={issues}
              view={view}
              onIssueClick={handleIssueClick}
              onCreateIssue={handleCreateIssue}
            />
          </div>
        )}
      </div>

      {/* Custom Footer — only rendered when there's something to show. */}
      {!error && (() => {
        const showPoweredBy = branding?.show_powered_by !== false
        const showReadOnlyNote = !branding?.footer_text && !view?.allow_issue_creation
        const hasFooterContent = Boolean(branding?.footer_text) || showReadOnlyNote || showPoweredBy
        if (!hasFooterContent) return null
        return (
          <footer className="px-4 sm:px-6 pb-6 mt-auto">
            <div className="text-center py-8 border-t border-border/30">
              {branding?.footer_text ? (
                <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                  {branding.footer_text}
                </p>
              ) : showReadOnlyNote ? (
                <p className="text-sm text-muted-foreground mb-1">
                  Read-only view of Linear issues
                </p>
              ) : null}
              {showPoweredBy && (
                <p className="text-xs text-muted-foreground">
                  {branding?.footer_text ? 'Powered by ' : 'Create your own at '}
                  <a
                    href="https://linear.gratis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline transition-colors"
                  >
                    linear.gratis
                  </a>
                </p>
              )}
            </div>
          </footer>
        )
      })()}

      {/* Issue Creation Modal */}
      <IssueCreationModal
        isOpen={showIssueModal}
        onClose={() => {
          setShowIssueModal(false)
          setDefaultStateName(undefined)
        }}
        onSubmit={handleSubmitIssue}
        teamName={view?.team_name}
        projectName={view?.project_name}
        teamId={view?.team_id}
        projectId={view?.project_id}
        apiToken="dummy"
        viewSlug={slug}
        defaultStateName={defaultStateName}
      />

      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          isOpen={showIssueDetail}
          onClose={handleCloseIssueDetail}
          issueId={selectedIssueId}
          viewSlug={slug}
          showComments={view?.show_comments}
          showActivity={view?.show_activity}
          showDescriptions={view?.show_descriptions}
          showAssignees={view?.show_assignees}
          showLabels={view?.show_labels}
          showPriorities={view?.show_priorities}
        />
      )}

      {/* Project Updates Modal */}
      {view?.project_id && (
        <ProjectUpdatesModal
          isOpen={showProjectUpdates}
          onClose={() => setShowProjectUpdates(false)}
          viewSlug={slug}
        />
      )}
    </div>
  )
}
