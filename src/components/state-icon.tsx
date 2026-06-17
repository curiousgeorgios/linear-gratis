type StateIconProps = {
  type: string
  color: string
  size?: number
}

/**
 * Linear workflow-state icon. Shape is driven by the state's `type`
 * (completed / started / everything-else) and tinted by the state's colour.
 * Extracted from kanban-board.tsx and filter-dropdown.tsx so list, board and
 * filter UIs render an identical icon.
 */
export function StateIcon({ type, color, size = 14 }: StateIconProps) {
  const strokeColor = color || '#9ca3af'

  if (type === 'completed') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M4.5 7l2 2 3-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (type === 'started') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7" />
        <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="6.094689747964199" transform="rotate(-90 7 7)" />
      </svg>
    )
  }

  // Backlog uses a dashed ring (matching Linear exactly), distinct from the
  // solid ring of the unstarted/"Todo" state handled by the default below.
  if (type === 'backlog') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="1.4 1.74" strokeDashoffset="0.65" />
        <circle cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="12.189379495928398" transform="rotate(-90 7 7)" />
      </svg>
    )
  }

  // Cancelled: filled circle with a white cross, matching Linear.
  if (type === 'canceled' || type === 'cancelled') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M5.3 5.3l3.4 3.4M8.7 5.3l-3.4 3.4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7" />
      <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="12.189379495928398" transform="rotate(-90 7 7)" />
    </svg>
  )
}
