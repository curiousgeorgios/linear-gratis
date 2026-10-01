'use client'

import { useEffect, useState } from 'react'
import { Star, GitFork, Users } from 'lucide-react'
import { useT } from '@/lib/i18n/client'

const REPO_OWNER = 'curiousgeorgios'
const REPO_NAME = 'linear-gratis'

interface GitHubStats {
  stars: number
  forks: number
  contributors: number
}

interface GitHubRepoResponse {
  stargazers_count: number
  forks_count: number
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

export function GitHubStars() {
  const t = useT()

  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    async function fetchStars() {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
          { next: { revalidate: 3600 } } // Cache for 1 hour
        )
        if (response.ok) {
          const data: GitHubRepoResponse = await response.json()
          setStars(data.stargazers_count)
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stars:', error)
      }
    }

    fetchStars()
  }, [])

  return (
    <a
      href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
    >
      <Star className="h-4 w-4" />
      <span>{t("Star on GitHub")}</span>
      {stars !== null && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{formatNumber(stars)}</span>
        </>
      )}
    </a>
  )
}

export function GitHubStatsBar() {
  const t = useT()

  const [stats, setStats] = useState<GitHubStats | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [repoResponse, contributorsResponse] = await Promise.all([
          fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`),
          fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contributors?per_page=1`, {
            headers: { Accept: 'application/vnd.github.v3+json' }
          }),
        ])

        if (repoResponse.ok) {
          const repoData: GitHubRepoResponse = await repoResponse.json()

          // Get contributor count from Link header
          let contributorCount = 0
          const linkHeader = contributorsResponse.headers.get('Link')
          if (linkHeader) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/)
            if (match) {
              contributorCount = parseInt(match[1], 10)
            }
          } else if (contributorsResponse.ok) {
            const contributors: unknown[] = await contributorsResponse.json()
            contributorCount = Array.isArray(contributors) ? contributors.length : 0
          }

          setStats({
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            contributors: contributorCount,
          })
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stats:', error)
      }
    }

    fetchStats()
  }, [])

  if (!stats) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4" />
        <span>{formatNumber(stats.stars)} {t("stars")}</span>
      </div>
      <div className="flex items-center gap-2">
        <GitFork className="h-4 w-4" />
        <span>{formatNumber(stats.forks)} {t("forks")}</span>
      </div>
      {stats.contributors > 0 && (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{stats.contributors} {t("contributors")}</span>
        </div>
      )}
    </div>
  )
}
