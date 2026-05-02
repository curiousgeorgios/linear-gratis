'use client';

import Link from 'next/link';

export type TimelineProject = {
  id: string;
  name: string;
  color: string | null;
  status: string;
  startDate: string | null;
  targetDate: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};

const MONTH_WIDTH = 120; // px per month
const ROW_HEIGHT = 44;
const LABEL_WIDTH = 200;

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function dayOffset(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysInMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  return ((to.getTime() - from.getTime()) / msPerDay) / daysInMonth;
}

export function RoadmapTimeline({ projects }: { projects: TimelineProject[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-sm">No projects with dates in this roadmap</p>
      </div>
    );
  }

  // Determine visible range
  const datedProjects = projects.filter(p => p.startDate || p.targetDate);
  const allDates = datedProjects.flatMap(p => [
    p.startDate ? new Date(p.startDate) : null,
    p.targetDate ? new Date(p.targetDate) : null,
  ]).filter(Boolean) as Date[];

  const minDate = allDates.length > 0
    ? new Date(Math.min(...allDates.map(d => d.getTime())))
    : new Date();
  const maxDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map(d => d.getTime())))
    : addMonths(new Date(), 3);

  const rangeStart = startOfMonth(addMonths(minDate, -1));
  const rangeEnd = startOfMonth(addMonths(maxDate, 2));
  const totalMonths = monthsBetween(rangeStart, rangeEnd) + 1;

  const months = Array.from({ length: totalMonths }, (_, i) => addMonths(rangeStart, i));
  const today = new Date();
  const todayOffset = monthsBetween(rangeStart, today) + dayOffset(startOfMonth(today), today);

  function barStyle(project: TimelineProject) {
    const start = project.startDate ? new Date(project.startDate) : null;
    const end = project.targetDate ? new Date(project.targetDate) : null;
    if (!start && !end) return null;

    const effectiveStart = start ?? end!;
    const effectiveEnd = end ?? start!;

    const left = (monthsBetween(rangeStart, effectiveStart) + dayOffset(startOfMonth(effectiveStart), effectiveStart)) * MONTH_WIDTH;
    const right = (monthsBetween(rangeStart, effectiveEnd) + dayOffset(startOfMonth(effectiveEnd), effectiveEnd)) * MONTH_WIDTH;
    const width = Math.max(right - left, MONTH_WIDTH * 0.5);

    return { left, width };
  }

  const totalWidth = totalMonths * MONTH_WIDTH;

  return (
    <div className="overflow-auto">
      <div style={{ minWidth: LABEL_WIDTH + totalWidth }}>
        {/* Header — months */}
        <div className="flex sticky top-0 bg-background z-10 border-b border-border">
          <div style={{ width: LABEL_WIDTH }} className="shrink-0 border-r border-border" />
          <div className="flex">
            {months.map((m, i) => (
              <div
                key={i}
                style={{ width: MONTH_WIDTH }}
                className="shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground border-r border-border/50"
              >
                {m.toLocaleDateString('en', { month: 'short', year: i === 0 || m.getMonth() === 0 ? '2-digit' : undefined })}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {projects.map(project => {
          const bar = barStyle(project);
          const color = project.color ?? '#5E6AD2';

          return (
            <div
              key={project.id}
              className="flex items-center border-b border-border/40 hover:bg-accent/20 transition-colors"
              style={{ height: ROW_HEIGHT }}
            >
              {/* Label */}
              <div
                style={{ width: LABEL_WIDTH }}
                className="shrink-0 border-r border-border px-3 flex items-center gap-2 h-full"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <Link
                  href={`/projects/${project.id}`}
                  className="text-sm truncate hover:text-primary transition-colors"
                >
                  {project.name}
                </Link>
              </div>

              {/* Timeline row */}
              <div className="flex-1 relative h-full" style={{ width: totalWidth }}>
                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/40 z-10"
                  style={{ left: todayOffset * MONTH_WIDTH }}
                />

                {/* Month grid lines */}
                {months.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-border/30"
                    style={{ left: i * MONTH_WIDTH }}
                  />
                ))}

                {/* Project bar */}
                {bar && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 text-xs font-medium text-white overflow-hidden"
                    style={{
                      left: bar.left,
                      width: bar.width,
                      height: 26,
                      backgroundColor: color,
                      opacity: project.status === 'cancelled' ? 0.4 : 1,
                    }}
                    title={`${project.name} — ${STATUS_LABELS[project.status] ?? project.status}`}
                  >
                    <span className="truncate">{project.name}</span>
                  </div>
                )}

                {/* No dates placeholder */}
                {!bar && (
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-xs text-muted-foreground italic">No dates set</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
