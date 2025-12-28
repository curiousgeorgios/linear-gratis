'use client'

import { useState, useEffect, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { KanbanView } from '@/components/roadmap/kanban-view'
import { TimelineView } from '@/components/roadmap/timeline-view'
import { ItemDetailModal } from '@/components/roadmap/item-detail-modal'
import { RefreshCw, Lock, LayoutGrid, Calendar } from 'lucide-react'
import { useBrandingSettings, applyBrandingToPage, getBrandingStyles } from '@/hooks/use-branding'
import type { RoadmapIssue } from '@/lib/linear'
import type { KanbanColumn } from '@/lib/supabase'

interface RoadmapPageProps {
  params: Promise<{
    slug: string
  }>
}

interface RoadmapData {
  id: string
  user_id: string
  name: string
  slug: string
  title: string
  description?: string
  layout_type: 'kanban' | 'timeline'
  timeline_granularity: 'month' | 'quarter'
  kanban_columns: KanbanColumn[]
  show_item_descriptions: boolean
  show_item_dates: boolean
  show_vote_counts: boolean
  show_comment_counts: boolean
  allow_voting: boolean
  allow_comments: boolean
  require_email_for_comments: boolean
  password_protected: boolean
}

interface RoadmapResponse {
  success: true
  roadmap: RoadmapData
  issues: RoadmapIssue[]
  voteCounts: Record<string, number>
  commentCounts: Record<string, number>
  projects: Array<{ id: string; name: string; color?: string }>
}

// Simple fingerprint generation (in production, use FingerprintJS)
async function generateFingerprint(): Promise<string> {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ].join('|')

  // Use SubtleCrypto to hash the data
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function RoadmapPage({ params }: RoadmapPageProps) {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [issues, setIssues] = useState<RoadmapIssue[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [projects, setProjects] = useState<Array<{ id: string; name: string; color?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [authenticating, setAuthenticating] = useState(false)
  const [slug, setSlug] = useState<string>('')
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [layoutType, setLayoutType] = useState<'kanban' | 'timeline'>('kanban')
  const [selectedIssue, setSelectedIssue] = useState<RoadmapIssue | null>(null)
  const [showItemDetail, setShowItemDetail] = useState(false)

  // Load branding settings for this roadmap's owner
  const { branding } = useBrandingSettings(roadmap?.user_id || null)

  // Generate fingerprint on mount
  useEffect(() => {
    generateFingerprint().then(setFingerprint)
  }, [])

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params
      setSlug(resolvedParams.slug)
    }
    initParams()
  }, [params])

  const loadRoadmap = useCallback(async (providedPassword?: string) => {
    if (!slug) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/roadmap/${slug}`, {
        method: providedPassword ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(providedPassword && { body: JSON.stringify({ password: providedPassword }) })
      })

      const data = await response.json() as RoadmapResponse & { requiresPassword?: boolean; error?: string }

      if (!response.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true)
          setRoadmap(null)
          setIssues([])
          return
        } else if (response.status === 404) {
          notFound()
          return
        } else {
          setError(data.error || 'Failed to load roadmap')
          return
        }
      }

      setRoadmap(data.roadmap)
      setIssues(data.issues)
      setVoteCounts(data.voteCounts)
      setCommentCounts(data.commentCounts)
      setProjects(data.projects)
      setLayoutType(data.roadmap.layout_type)
      setLastUpdated(new Date())
      setRequiresPassword(false)

    } catch (err) {
      console.error('Error loading roadmap:', err)
      setError('Failed to load the roadmap')
    } finally {
      setLoading(false)
      setAuthenticating(false)
    }
  }, [slug])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setAuthenticating(true)
    await loadRoadmap(password)
  }

  const handleRefresh = async () => {
    if (!slug) return

    setRefreshing(true)
    try {
      const response = await fetch(`/api/roadmap/${slug}`)
      const data = await response.json() as RoadmapResponse

      if (response.ok) {
        setIssues(data.issues)
        setVoteCounts(data.voteCounts)
        setCommentCounts(data.commentCounts)
        setProjects(data.projects)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Error refreshing:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleVote = (issueId: string, voted: boolean, newCount: number) => {
    setVoteCounts((prev) => ({
      ...prev,
      [issueId]: newCount,
    }))
  }

  const handleIssueClick = (issue: RoadmapIssue) => {
    setSelectedIssue(issue)
    setShowItemDetail(true)
  }

  const handleCloseItemDetail = () => {
    setShowItemDetail(false)
    setSelectedIssue(null)
  }

  useEffect(() => {
    if (slug) {
      loadRoadmap()
    }
  }, [slug, loadRoadmap])

  // Apply branding when it loads
  useEffect(() => {
    if (branding) {
      applyBrandingToPage(branding)
    }
  }, [branding])

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
          <p className="text-sm text-muted-foreground">Loading roadmap...</p>
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
              <h1 className="text-lg font-medium tracking-tight mb-2">Protected roadmap</h1>
              <p className="text-sm text-muted-foreground">
                This roadmap is password protected. Enter the password to continue.
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
                  'Access roadmap'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    notFound()
    return null
  }

  return (
    <div className="min-h-screen bg-background linear-gradient-bg flex flex-col" style={getBrandingStyles(branding)}>
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Left side - Brand logo or title */}
          <div className="flex items-center gap-3 sm:gap-6 max-w-[50%] min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.brand_name || 'Logo'}
                  style={{
                    width: `${branding.logo_width || 120}px`,
                    height: `${branding.logo_height || 40}px`,
                    objectFit: 'contain',
                  }}
                  className="flex-shrink-0"
                />
              ) : (
                <>
                  <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🗺️</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-medium tracking-tight truncate">
                    {branding?.brand_name || roadmap.title}
                  </h2>
                </>
              )}
            </div>

            {/* Navigation tab */}
            <div className="hidden sm:flex items-center gap-1">
              <div className="px-3 py-1.5 rounded-md bg-accent/50 text-sm font-medium text-foreground border border-border/50">
                {roadmap.title}
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

            {/* Layout toggle */}
            <div className="flex items-center bg-muted/50 rounded-md p-0.5">
              <button
                onClick={() => setLayoutType('kanban')}
                className={`p-1.5 rounded transition-colors ${
                  layoutType === 'kanban'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayoutType('timeline')}
                className={`p-1.5 rounded transition-colors ${
                  layoutType === 'timeline'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Timeline view"
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Description bar */}
        {roadmap.description && (
          <div className="px-4 sm:px-6 py-2 border-t border-border/30">
            <p className="text-sm text-muted-foreground">{roadmap.description}</p>
          </div>
        )}

        {/* Project filters */}
        {projects.length > 1 && (
          <div className="px-4 sm:px-6 py-2 border-t border-border/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Categories:</span>
              {projects.map((project) => (
                <span
                  key={project.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md"
                  style={{
                    backgroundColor: project.color ? `${project.color}15` : 'var(--muted)',
                    color: project.color || 'var(--muted-foreground)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color || 'var(--muted-foreground)' }}
                  />
                  {project.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 w-full p-4 sm:p-6">
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
          <div className="linear-fade-in w-full">
            {layoutType === 'kanban' ? (
              <KanbanView
                issues={issues}
                columns={roadmap.kanban_columns}
                roadmapSlug={slug}
                voteCounts={voteCounts}
                commentCounts={commentCounts}
                fingerprint={fingerprint}
                showDescriptions={roadmap.show_item_descriptions}
                showDates={roadmap.show_item_dates}
                showVoteCounts={roadmap.show_vote_counts}
                showCommentCounts={roadmap.show_comment_counts}
                allowVoting={roadmap.allow_voting}
                allowComments={roadmap.allow_comments}
                onIssueClick={handleIssueClick}
                onVote={handleVote}
              />
            ) : (
              <TimelineView
                issues={issues}
                granularity={roadmap.timeline_granularity}
                roadmapSlug={slug}
                voteCounts={voteCounts}
                commentCounts={commentCounts}
                fingerprint={fingerprint}
                showDates={roadmap.show_item_dates}
                showVoteCounts={roadmap.show_vote_counts}
                showCommentCounts={roadmap.show_comment_counts}
                allowVoting={roadmap.allow_voting}
                allowComments={roadmap.allow_comments}
                onIssueClick={handleIssueClick}
                onVote={handleVote}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!error && (
        <footer className="px-4 sm:px-6 pb-6 mt-auto">
          <div className="text-center py-8 border-t border-border/30">
            {branding?.footer_text ? (
              <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                {branding.footer_text}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-1">
                Product roadmap powered by Linear
              </p>
            )}
            {(branding?.show_powered_by !== false) && (
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
      )}

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={showItemDetail}
        onClose={handleCloseItemDetail}
        issue={selectedIssue}
        roadmapSlug={slug}
        voteCount={selectedIssue ? (voteCounts[selectedIssue.id] || 0) : 0}
        commentCount={selectedIssue ? (commentCounts[selectedIssue.id] || 0) : 0}
        fingerprint={fingerprint}
        allowVoting={roadmap?.allow_voting || false}
        allowComments={roadmap?.allow_comments || false}
        requireEmailForComments={roadmap?.require_email_for_comments || false}
        showVoteCounts={roadmap?.show_vote_counts || false}
        onVote={handleVote}
      />
    </div>
  )
}
