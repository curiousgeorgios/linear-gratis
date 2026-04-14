/**
 * Linear priority icons.
 *
 * Priority values follow Linear's schema:
 *   0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low.
 *
 * Colours and shapes are matched to Linear.app for visual parity.
 */

type PriorityIconProps = {
  priority: number
  priorityLabel?: string
  className?: string
}

const URGENT_FILL = '#ff7235'
const BAR_FILL = '#9c9da6'

export function PriorityIcon({
  priority,
  priorityLabel,
  className = 'w-3.5 h-3.5',
}: PriorityIconProps) {
  const commonProps = {
    className,
    viewBox: '0 0 16 16',
    role: 'img' as const,
    'aria-label': priorityLabel ?? priorityLabelFromValue(priority),
  }

  if (priority === 1) {
    return (
      <svg {...commonProps} fill={URGENT_FILL}>
        <path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z" />
      </svg>
    )
  }

  if (priority === 2) {
    return (
      <svg {...commonProps} fill={BAR_FILL}>
        <rect x="1.5" y="8" width="3" height="6" rx="1" />
        <rect x="6.5" y="5" width="3" height="9" rx="1" />
        <rect x="11.5" y="2" width="3" height="12" rx="1" />
      </svg>
    )
  }

  if (priority === 3) {
    return (
      <svg {...commonProps} fill={BAR_FILL}>
        <rect x="1.5" y="8" width="3" height="6" rx="1" />
        <rect x="6.5" y="5" width="3" height="9" rx="1" />
        <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity="0.4" />
      </svg>
    )
  }

  if (priority === 4) {
    return (
      <svg {...commonProps} fill={BAR_FILL}>
        <rect x="1.5" y="8" width="3" height="6" rx="1" />
        <rect x="6.5" y="5" width="3" height="9" rx="1" fillOpacity="0.4" />
        <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity="0.4" />
      </svg>
    )
  }

  return (
    <svg {...commonProps} fill={BAR_FILL}>
      <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
      <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
      <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
    </svg>
  )
}

function priorityLabelFromValue(priority: number): string {
  switch (priority) {
    case 1: return 'Urgent'
    case 2: return 'High'
    case 3: return 'Medium'
    case 4: return 'Low'
    default: return 'No priority'
  }
}

type EstimateIconProps = {
  className?: string
}

export function EstimateIcon({ className = 'w-3.5 h-3.5' }: EstimateIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      role="img"
      aria-label="Estimate"
    >
      <path
        fillRule="evenodd"
        d="M3.741 14.5h8.521c1.691 0 2.778-1.795 1.993-3.293l-4.26-8.134c-.842-1.608-3.144-1.608-3.986 0l-4.26 8.134C.962 12.705 2.05 14.5 3.74 14.5ZM8 3.368a.742.742 0 0 0-.663.402l-4.26 8.134A.75.75 0 0 0 3.741 13H8V3.367Z"
        clipRule="evenodd"
      />
    </svg>
  )
}
