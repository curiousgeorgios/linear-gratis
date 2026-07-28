'use client'

import { isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IssueDetail, ReferencedIssue } from '@/app/api/public-view/[slug]/issue/[issueId]/route'
import { EstimateIcon } from '@/components/priority-icon'

export type { IssueDetail, ReferencedIssue }

const ISSUE_IDENTIFIER_PATTERN = /\b[A-Z][A-Z0-9]*-\d+\b/i
const ISSUE_IDENTIFIER_GLOBAL_PATTERN = /\b[A-Z][A-Z0-9]*-\d+\b/g
const GENERATED_ISSUE_REFERENCE_PREFIX = '#linear-issue-'
const SKIP_ISSUE_REFERENCE_NODE_TYPES = new Set(['link', 'linkReference', 'inlineCode', 'code'])

type MarkdownNode = {
  type?: string
  value?: string
  url?: string
  title?: string | null
  children?: MarkdownNode[]
}

function remarkIssueReferences() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (!node.children || SKIP_ISSUE_REFERENCE_NODE_TYPES.has(node.type || '')) return

      const children: MarkdownNode[] = []

      for (const child of node.children) {
        if (child.type === 'text' && child.value) {
          let lastIndex = 0
          let matched = false

          for (const match of child.value.matchAll(ISSUE_IDENTIFIER_GLOBAL_PATTERN)) {
            const identifier = match[0].toUpperCase()
            const matchIndex = match.index ?? 0

            if (matchIndex > lastIndex) {
              children.push({ type: 'text', value: child.value.slice(lastIndex, matchIndex) })
            }

            children.push({
              type: 'link',
              url: `${GENERATED_ISSUE_REFERENCE_PREFIX}${identifier}`,
              title: null,
              children: [{ type: 'text', value: identifier }],
            })

            lastIndex = matchIndex + match[0].length
            matched = true
          }

          if (matched) {
            if (lastIndex < child.value.length) {
              children.push({ type: 'text', value: child.value.slice(lastIndex) })
            }
            continue
          }
        }

        visit(child)
        children.push(child)
      }

      node.children = children
    }

    visit(tree)
  }
}

export const getStateIcon = (stateType: string, color: string) => {
  const strokeColor = color || '#9ca3af'

  if (stateType === 'completed') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5"></circle>
        <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  }

  if (stateType === 'started') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
        <circle className="progress" cx="8" cy="8" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="6.094689747964199" transform="rotate(-90 8 8)"></circle>
      </svg>
    )
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
      <circle className="progress" cx="8" cy="8" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="12.189379495928398" transform="rotate(-90 8 8)"></circle>
    </svg>
  )
}

function getNodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return getNodeText(node.props.children)
  return ''
}

function findIssueIdentifier(text: string, href?: string): string | null {
  const textMatch = text.trim().match(ISSUE_IDENTIFIER_PATTERN)
  if (textMatch) return textMatch[0].toUpperCase()

  if (!href) return null
  const hrefMatch = href.match(ISSUE_IDENTIFIER_PATTERN)
  return hrefMatch ? hrefMatch[0].toUpperCase() : null
}

function isGeneratedIssueReferenceHref(href?: string) {
  return href?.startsWith(GENERATED_ISSUE_REFERENCE_PREFIX) ?? false
}

function IssueReferenceLink({
  href,
  identifier,
  issue,
}: {
  href?: string
  identifier: string
  issue?: ReferencedIssue
}) {
  const destination = issue?.url || (isGeneratedIssueReferenceHref(href) ? undefined : href)
  const className = 'not-prose inline-flex w-fit max-w-none items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-accent/60 px-1.5 py-0.5 align-middle text-sm font-medium leading-5 text-foreground no-underline shadow-xs transition-colors hover:bg-accent hover:no-underline'
  const estimateLabel = issue?.estimate != null && issue.estimate > 0
    ? ` · ${issue.estimate} point${issue.estimate === 1 ? '' : 's'}`
    : ''
  const title = issue ? `${issue.identifier} ${issue.title}${estimateLabel}` : identifier
  const content = (
    <>
      <span className="shrink-0">
        {issue ? getStateIcon(issue.state.type, issue.state.color) : getStateIcon('unstarted', '#8a8f98')}
      </span>
      <span>
        <span className="font-mono text-muted-foreground">{issue?.identifier || identifier}</span>
        {issue?.title && <span className="font-normal text-foreground"> {issue.title}</span>}
      </span>
      {issue?.estimate != null && issue.estimate > 0 && (
        <span
          className="inline-flex shrink-0 items-center gap-1 text-xs font-normal tabular-nums text-muted-foreground"
          aria-label={`Estimate: ${issue.estimate} point${issue.estimate === 1 ? '' : 's'}`}
        >
          <EstimateIcon className="size-3.5" />
          <span aria-hidden="true">{issue.estimate}</span>
        </span>
      )}
    </>
  )

  if (!destination) {
    return (
      <span className={className} title={title}>
        {content}
      </span>
    )
  }

  return (
    <a
      href={destination}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
    >
      {content}
    </a>
  )
}

export function LinearMarkdown({
  children,
  references,
  className = '',
}: {
  children: string
  references: Record<string, ReferencedIssue>
  className?: string
}) {
  return (
    <div className={`prose prose-sm max-w-none text-foreground/90 markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkIssueReferences]}
        components={{
          input: ({ ...props }) => (
            <input
              {...props}
              className="mr-2 accent-primary cursor-default"
              disabled
            />
          ),
          a: ({ children, href, ...props }) => {
            const identifier = findIssueIdentifier(getNodeText(children), href)
            if (identifier) {
              return (
                <IssueReferenceLink
                  href={href}
                  identifier={identifier}
                  issue={references[identifier]}
                />
              )
            }

            return (
              <a
                {...props}
                href={href}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            )
          },
          code: ({ className, ...props }) => {
            const isInline = !className || !className.includes('language-')
            return isInline ? (
              <code {...props} className="bg-accent/60 px-1.5 py-0.5 rounded text-sm font-mono" />
            ) : (
              <code {...props} className="block bg-accent/60 p-3 rounded-md text-sm font-mono overflow-x-auto" />
            )
          },
          ul: ({ ...props }) => (
            <ul {...props} className="list-disc list-outside space-y-1 my-2 ml-5" />
          ),
          ol: ({ ...props }) => (
            <ol {...props} className="list-decimal list-outside space-y-1 my-2 ml-5" />
          ),
          li: ({ ...props }) => (
            <li {...props} className="leading-7 marker:text-muted-foreground" />
          ),
          p: ({ ...props }) => (
            <p {...props} className="my-2 leading-relaxed" />
          ),
          h1: ({ ...props }) => (
            <h1 {...props} className="text-xl font-semibold mt-6 mb-3" />
          ),
          h2: ({ ...props }) => (
            <h2 {...props} className="text-lg font-semibold mt-5 mb-2" />
          ),
          h3: ({ ...props }) => (
            <h3 {...props} className="text-base font-semibold mt-4 mb-2" />
          ),
          img: ({ alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} alt={alt ?? ''} className="rounded-lg max-w-full my-4" />
          ),
          blockquote: ({ ...props }) => (
            <blockquote {...props} className="border-l-4 border-border pl-4 italic text-muted-foreground my-3" />
          ),
          hr: ({ ...props }) => (
            <hr {...props} className="border-border my-4" />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table {...props} className="min-w-full border border-border rounded-md" />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead {...props} className="bg-accent/40" />
          ),
          th: ({ ...props }) => (
            <th {...props} className="border border-border px-3 py-2 text-left font-medium" />
          ),
          td: ({ ...props }) => (
            <td {...props} className="border border-border px-3 py-2 align-top" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMins = Math.floor(diffInMs / 60000)
  const diffInHours = Math.floor(diffInMs / 3600000)
  const diffInDays = Math.floor(diffInMs / 86400000)

  if (diffInMins < 1) return 'just now'
  if (diffInMins < 60) return `${diffInMins}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Relative label that continues past a week (Linear shows e.g. "5mo ago").
// The existing formatDate only goes up to days, so dates like "created" —
// almost always older than a week — need this wider scale.
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const min = Math.floor(diffMs / 60000)
  const hour = Math.floor(diffMs / 3600000)
  const day = Math.floor(diffMs / 86400000)

  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hour < 24) return `${hour}h ago`
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.floor(day / 7)}w ago`
  if (day < 365) return `${Math.floor(day / 30)}mo ago`
  return `${Math.floor(day / 365)}y ago`
}

// Full timestamp for the hover tooltip, British day-month-year order,
// e.g. "Thu, 19 Feb 2026, 20:31:31".
export function formatAbsoluteDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
