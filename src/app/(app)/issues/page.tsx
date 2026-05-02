'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTeam } from '@/contexts/team-context';
import { PriorityIcon } from '@/components/priority-icon';
import { StatusIcon } from '@/components/status-icon';
import { KanbanBoard, type KanbanIssue, type KanbanStatus } from '@/components/kanban-board';
import { priorityToNumber } from '@/lib/priority';
import { Plus, ChevronDown, ChevronRight, LayoutList, Kanban } from 'lucide-react';

type Label = { id: string; name: string; color: string };

type Issue = {
  id: string;
  title: string;
  priority: string;
  estimate: number | null;
  statusId: string;
  statusName: string;
  statusColor: string;
  statusType: string;
  projectName: string | null;
  projectColor: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  labels: Label[];
  createdAt: string;
};

type StatusGroup = {
  statusId: string;
  statusName: string;
  statusColor: string;
  statusType: string;
  issues: Issue[];
};

type Status = { id: string; name: string; color: string; type: string };

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="flex items-center gap-3 px-4 py-2 hover:bg-accent/40 transition-colors border-b border-border/30 last:border-0"
    >
      <PriorityIcon priority={priorityToNumber(issue.priority)} className="w-3.5 h-3.5 shrink-0" />
      <StatusIcon type={issue.statusType} color={issue.statusColor} className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-sm truncate">{issue.title}</span>
      <div className="flex items-center gap-2 shrink-0">
        {issue.labels.map(l => (
          <span
            key={l.id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: `${l.color}20`, color: l.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.name}
          </span>
        ))}
        {issue.projectName && (
          <span className="text-xs text-muted-foreground hidden sm:block">{issue.projectName}</span>
        )}
        {issue.assigneeName && (
          issue.assigneeAvatarUrl
            ? <img src={issue.assigneeAvatarUrl} alt={issue.assigneeName} title={issue.assigneeName} className="h-4 w-4 rounded-full object-cover shrink-0" />
            : <span title={issue.assigneeName} className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground shrink-0">
                {issue.assigneeName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
              </span>
        )}
        {issue.estimate != null && (
          <span className="text-xs text-muted-foreground tabular-nums">{issue.estimate}</span>
        )}
      </div>
    </Link>
  );
}

function StatusGroupSection({ group }: { group: StatusGroup }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-accent/30 transition-colors"
      >
        {collapsed
          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        }
        <StatusIcon type={group.statusType} color={group.statusColor} className="h-3.5 w-3.5" />
        <span className="text-sm font-medium">{group.statusName}</span>
        <span className="text-xs text-muted-foreground ml-1">{group.issues.length}</span>
      </button>
      {!collapsed && group.issues.map(issue => <IssueRow key={issue.id} issue={issue} />)}
    </div>
  );
}

export default function IssuesPage() {
  const { activeTeam } = useTeam();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [view, setView] = useState<'list' | 'board'>('list');

  const load = useCallback(async () => {
    if (!activeTeam) return;
    setLoading(true);
    const [issuesRes, statusesRes] = await Promise.all([
      fetch(`/api/issues?teamId=${activeTeam.id}`),
      fetch(`/api/statuses?teamId=${activeTeam.id}`),
    ]);
    const { data: issueData } = await issuesRes.json() as { data: Issue[] };
    const { data: statusData } = await statusesRes.json() as { data: Status[] };
    setIssues(issueData);
    setStatuses(statusData);
    setLoading(false);
  }, [activeTeam]);

  useEffect(() => { load(); }, [load]);

  async function createIssue(statusId: string, title: string) {
    if (!activeTeam) return;
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: activeTeam.id, statusId, title }),
    });
    load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTeam || !newTitle.trim() || !statuses.length) return;
    await createIssue(statuses[0].id, newTitle.trim());
    setNewTitle('');
    setCreating(false);
  }

  async function handleStatusChange(issueId: string, statusId: string) {
    await fetch(`/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusId }),
    });
    setIssues(prev => prev.map(i => {
      if (i.id !== issueId) return i;
      const s = statuses.find(s => s.id === statusId)!;
      return { ...i, statusId: s.id, statusName: s.name, statusColor: s.color, statusType: s.type };
    }));
  }

  // Build groups for list view
  const groups: StatusGroup[] = statuses.map(s => ({
    statusId: s.id,
    statusName: s.name,
    statusColor: s.color,
    statusType: s.type,
    issues: issues.filter(i => i.statusId === s.id),
  })).filter(g => g.issues.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-semibold">Issues</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{activeTeam?.name ?? ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-muted/50 rounded-md p-0.5">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('board')}
              className={`p-1.5 rounded transition-colors ${view === 'board' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Board view"
            >
              <Kanban className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New issue
          </button>
        </div>
      </div>

      {/* Quick create (list view only) */}
      {creating && view === 'list' && (
        <form onSubmit={handleCreate} className="flex items-center gap-3 px-6 py-3 border-b border-border bg-accent/20">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Issue title…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors">
            Save
          </button>
          <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </form>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>
        ) : view === 'board' ? (
          <KanbanBoard
            statuses={statuses as KanbanStatus[]}
            issues={issues as KanbanIssue[]}
            onStatusChange={handleStatusChange}
            onCreateIssue={createIssue}
          />
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm">No issues yet</p>
            <button onClick={() => setCreating(true)} className="text-xs text-primary hover:underline">
              Create your first issue
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            {groups.map(group => <StatusGroupSection key={group.statusId} group={group} />)}
          </div>
        )}
      </div>
    </div>
  );
}
