import type { RoadmapIssue } from './linear'

export type RoadmapSort = 'votes' | 'newest' | 'oldest'

export function sortRoadmapIssues(
  issues: readonly RoadmapIssue[],
  sort: RoadmapSort,
  voteCounts: Readonly<Record<string, number>> = {},
): RoadmapIssue[] {
  return [...issues].sort((a, b) => {
    if (sort === 'votes') return (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0)

    const aDate = Date.parse(a.createdAt)
    const bDate = Date.parse(b.createdAt)
    const aValid = Number.isFinite(aDate)
    const bValid = Number.isFinite(bDate)
    // Undated items stay last in either direction.
    if (aValid !== bValid) return aValid ? -1 : 1
    if (aValid && bValid && aDate !== bDate) {
      return sort === 'oldest' ? aDate - bDate : bDate - aDate
    }
    return a.id.localeCompare(b.id)
  })
}
