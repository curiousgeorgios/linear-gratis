'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface ProjectUpdate {
  id: string
  body: string
  createdAt: string
  editedAt?: string
  health: string
  user: {
    id: string
    name: string
    displayName: string
    avatarUrl?: string
    email: string
  }
  diffMarkdown?: string
  isDiffHidden: boolean
  project: {
    id: string
    name: string
    progress: number
    state: string
  }
}

interface ProjectUpdateData {
  project: {
    id: string
    name: string
    progress: number
    state: string
  }
  updates: ProjectUpdate[]
}

interface ProjectUpdatesModalProps {
  isOpen: boolean
  onClose: () => void
  viewSlug: string
}

export function ProjectUpdatesModal({ isOpen, onClose, viewSlug }: ProjectUpdatesModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProjectUpdateData | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchProjectUpdates()
    }
  }, [isOpen, viewSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProjectUpdates = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public-view/${viewSlug}/project-updates`)
      const result = await response.json() as { success?: boolean; error?: string; project?: ProjectUpdateData['project']; updates?: ProjectUpdate[] }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch project updates')
      }

      if (result.project && result.updates) {
        setData({ project: result.project, updates: result.updates })
      }
    } catch (err) {
      console.error('Error fetching project updates:', err)
      setError(err instanceof Error ? err.message : 'Failed to load project updates')
    } finally {
      setLoading(false)
    }
  }

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'ontrack':
      case 'on_track':
        return 'lch(69.333% 64.37 141.95)'
      case 'atrisk':
      case 'at_risk':
        return 'lch(65% 75 85)'
      case 'offtrack':
      case 'off_track':
        return 'lch(55% 75 30)'
      default:
        return 'lch(62.6% 1.35 272)'
    }
  }

  const getHealthLabel = (health: string) => {
    switch (health.toLowerCase()) {
      case 'ontrack':
      case 'on_track':
        return 'On track'
      case 'atrisk':
      case 'at_risk':
        return 'At risk'
      case 'offtrack':
      case 'off_track':
        return 'Off track'
      default:
        return health
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return 'Today'
    } else if (diffInDays === 1) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long' })
  }

  // Group updates by month
  const groupedUpdates = data?.updates.reduce((acc, update) => {
    const month = formatMonth(update.createdAt)
    if (!acc[month]) {
      acc[month] = []
    }
    acc[month].push(update)
    return acc
  }, {} as Record<string, ProjectUpdate[]>) || {}

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[lch(4.8%_0.7_272)] border border-[lch(14.74%_3.54_272)] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          fontFamily: 'var(--font-regular, "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[lch(14.74%_3.54_272)]">
          <div className="flex items-center gap-3">
            <svg className="" width="16" height="16" viewBox="0 0 16 16" role="img" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <use href="#Project"></use>
            </svg>
            <h2 className="text-lg font-medium text-[lch(100%_0_272)]">
              {data?.project.name || 'Project'} updates
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[lch(10.633%_3.033_272)] rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-[lch(62.6%_1.35_272)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarGutter: 'stable' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8">
                <svg className="animate-spin text-[lch(62.6%_1.35_272)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-[lch(62.6%_1.35_272)] mb-4">{error}</p>
                <button
                  onClick={fetchProjectUpdates}
                  className="px-4 py-2 bg-[lch(10.633%_3.033_272)] hover:bg-[lch(14.133%_4.2_272)] text-[lch(100%_0_272)] rounded-md transition-colors text-sm"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : !data?.updates.length ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-[lch(62.6%_1.35_272)]">No project updates found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedUpdates).map(([month, updates]) => (
                <div key={month}>
                  {/* Month separator */}
                  <div className="text-xs font-medium text-[lch(62.6%_1.35_272)] mb-4">{month}</div>

                  {/* Updates for this month */}
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="mb-6 bg-[lch(7.133%_1.867_272)] border border-[lch(14.74%_3.54_272)] rounded-lg p-4"
                    >
                      {/* Update header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Health status */}
                          <div className="flex items-center gap-2">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill={getHealthColor(update.health)}
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle r="8" cx="8" cy="8" fill={`${getHealthColor(update.health)} / 0.25`}></circle>
                              <path fillRule="evenodd" clipRule="evenodd" d="M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z"></path>
                            </svg>
                            <span className="text-sm font-medium" style={{ color: getHealthColor(update.health) }}>
                              {getHealthLabel(update.health)}
                            </span>
                          </div>

                          {/* Author and date */}
                          <div className="flex items-center gap-2 text-sm text-[lch(62.6%_1.35_272)]">
                            {update.user.avatarUrl && (
                              <img
                                src={update.user.avatarUrl}
                                alt={update.user.displayName}
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            <span>{update.user.displayName}</span>
                            <span>·</span>
                            <span>{formatDate(update.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Update body */}
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({children}) => <h1 className="text-xl font-semibold text-[lch(100%_0_272)] mb-3">{children}</h1>,
                            h2: ({children}) => <h2 className="text-lg font-semibold text-[lch(100%_0_272)] mb-2 mt-4">{children}</h2>,
                            h3: ({children}) => <h3 className="text-base font-semibold text-[lch(100%_0_272)] mb-2 mt-3">{children}</h3>,
                            p: ({children}) => <p className="text-sm text-[lch(90.65%_1.35_272)] mb-2 leading-relaxed">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside text-sm text-[lch(90.65%_1.35_272)] space-y-1 mb-2">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside text-sm text-[lch(90.65%_1.35_272)] space-y-1 mb-2">{children}</ol>,
                            li: ({children}) => <li className="text-sm text-[lch(90.65%_1.35_272)]">{children}</li>,
                            strong: ({children}) => <strong className="font-semibold text-[lch(100%_0_272)]">{children}</strong>,
                            em: ({children}) => <em className="italic text-[lch(90.65%_1.35_272)]">{children}</em>,
                            code: ({children}) => <code className="px-1.5 py-0.5 bg-[lch(14.133%_4.2_272)] rounded text-xs font-mono text-[lch(100%_0_272)]">{children}</code>,
                          }}
                        >
                          {update.body}
                        </ReactMarkdown>
                      </div>

                      {/* Progress diff if available */}
                      {update.diffMarkdown && !update.isDiffHidden && (
                        <div className="mt-4 pt-4 border-t border-[lch(14.74%_3.54_272)]">
                          <div className="text-xs font-medium text-[lch(62.6%_1.35_272)] mb-2">Changes</div>
                          <div className="text-sm text-[lch(90.65%_1.35_272)]">
                            <ReactMarkdown>{update.diffMarkdown}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Defs for icons */}
      <svg style={{ display: 'none' }}>
        <defs>
          <symbol id="Project" viewBox="0 0 16 16">
            <path fillRule="evenodd" clipRule="evenodd" d="M2.5 2.5h11v11h-11v-11zM2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm3.5 4a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H6z"/>
          </symbol>
        </defs>
      </svg>
    </div>
  )
}
