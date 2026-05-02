export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
  no_priority: 0,
};

export function priorityToNumber(p: string): number {
  return PRIORITY_ORDER[p] ?? 0;
}

export function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    no_priority: 'No priority',
  };
  return map[p] ?? 'No priority';
}
