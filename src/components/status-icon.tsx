type StatusType = 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled' | string;

export function StatusIcon({ type, color, className = 'h-3.5 w-3.5' }: {
  type: StatusType;
  color: string;
  className?: string;
}) {
  const c = color;

  if (type === 'backlog') {
    return (
      <svg className={className} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.5" strokeDasharray="3.5 2" />
      </svg>
    );
  }
  if (type === 'unstarted') {
    return (
      <svg className={className} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === 'started') {
    return (
      <svg className={className} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.5" />
        <path d="M7 1a6 6 0 0 1 0 12V7L7 1Z" fill={c} />
      </svg>
    );
  }
  if (type === 'completed') {
    return (
      <svg className={className} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={c} />
        <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'cancelled') {
    return (
      <svg className={className} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.5" />
        <path d="M5 5l4 4M9 5l-4 4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return <svg className={className} viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.5" /></svg>;
}
