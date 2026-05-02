'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { PriorityIcon } from '@/components/priority-icon';
import { StatusIcon } from '@/components/status-icon';
import { priorityToNumber } from '@/lib/priority';
import { Plus } from 'lucide-react';

type Label = { id: string; name: string; color: string };

export type KanbanIssue = {
  id: string;
  title: string;
  priority: string;
  estimate: number | null;
  statusId: string;
  statusName: string;
  statusColor: string;
  statusType: string;
  projectName: string | null;
  labels: Label[];
};

export type KanbanStatus = {
  id: string;
  name: string;
  color: string;
  type: string;
};

function IssueCard({
  issue,
  onDragStart,
}: {
  issue: KanbanIssue;
  onDragStart: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(issue.id)}
      className="bg-card border border-border rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors group"
    >
      <Link href={`/issues/${issue.id}`} onClick={e => e.stopPropagation()}>
        <p className="text-sm mb-2 leading-snug group-hover:text-primary transition-colors">
          {issue.title}
        </p>
      </Link>
      <div className="flex items-center gap-2">
        <PriorityIcon priority={priorityToNumber(issue.priority)} className="w-3 h-3" />
        {issue.labels.map(l => (
          <span
            key={l.id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: `${l.color}20`, color: l.color }}
          >
            {l.name}
          </span>
        ))}
        {issue.estimate != null && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{issue.estimate}</span>
        )}
      </div>
    </div>
  );
}

function Column({
  status,
  issues,
  onDrop,
  onDragStart,
  onQuickCreate,
}: {
  status: KanbanStatus;
  issues: KanbanIssue[];
  onDrop: (statusId: string) => void;
  onDragStart: (id: string) => void;
  onQuickCreate: (statusId: string, title: string) => void;
}) {
  const [over, setOver] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onQuickCreate(status.id, title.trim());
    setTitle('');
    setCreating(false);
  }

  return (
    <div
      className={`flex flex-col w-72 shrink-0 rounded-lg border transition-colors ${
        over ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
      }`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(status.id); }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <StatusIcon type={status.type} color={status.color} className="h-3.5 w-3.5" />
        <span className="text-sm font-medium flex-1">{status.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{issues.length}</span>
        <button
          onClick={() => setCreating(c => !c)}
          className="p-0.5 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 min-h-16">
        {issues.map(issue => (
          <IssueCard key={issue.id} issue={issue} onDragStart={onDragStart} />
        ))}
      </div>

      {/* Quick create */}
      {creating && (
        <form onSubmit={handleSubmit} className="p-2 border-t border-border">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setCreating(false)}
            placeholder="Issue title…"
            className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          <div className="flex gap-2 mt-2">
            <button type="submit" className="flex-1 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors">
              Save
            </button>
            <button type="button" onClick={() => setCreating(false)} className="flex-1 py-1 border border-border rounded text-xs hover:bg-accent transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function KanbanBoard({
  statuses,
  issues,
  onStatusChange,
  onCreateIssue,
}: {
  statuses: KanbanStatus[];
  issues: KanbanIssue[];
  onStatusChange: (issueId: string, statusId: string) => void;
  onCreateIssue: (statusId: string, title: string) => void;
}) {
  const dragging = useRef<string | null>(null);

  function handleDrop(statusId: string) {
    if (dragging.current) {
      onStatusChange(dragging.current, statusId);
      dragging.current = null;
    }
  }

  const byStatus = statuses.reduce<Record<string, KanbanIssue[]>>((acc, s) => {
    acc[s.id] = issues.filter(i => i.statusId === s.id);
    return acc;
  }, {});

  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full">
      {statuses.map(status => (
        <Column
          key={status.id}
          status={status}
          issues={byStatus[status.id] ?? []}
          onDrop={handleDrop}
          onDragStart={id => { dragging.current = id; }}
          onQuickCreate={onCreateIssue}
        />
      ))}
    </div>
  );
}
