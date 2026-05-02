'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PriorityIcon } from '@/components/priority-icon';
import { StatusIcon } from '@/components/status-icon';
import { priorityToNumber, priorityLabel } from '@/lib/priority';
import { ArrowLeft, Trash2, Send, Layers, Plus, Check, X } from 'lucide-react';

type Label = { id: string; name: string; color: string };
type Comment = { id: string; content: string; createdAt: string; updatedAt: string };
type HistoryEntry = { id: string; field: string; oldValue: string; newValue: string; createdAt: string };
type Status = { id: string; name: string; color: string; type: string };
type Project = { id: string; name: string; color: string | null };
type User = { id: string; name: string; avatarUrl: string | null };
type Issue = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  estimate: number | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  teamId: string;
  statusId: string;
  statusName: string;
  statusColor: string;
  statusType: string;
  projectId: string | null;
  projectName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  labels: Label[];
  comments: Comment[];
  history: HistoryEntry[];
};

function Sidebar({ issue, statuses, projects, teamLabels, teamUsers, onUpdate, onAddTeamLabel }: {
  issue: Issue;
  statuses: Status[];
  projects: Project[];
  teamLabels: Label[];
  teamUsers: User[];
  onUpdate: (fields: Record<string, unknown>) => void;
  onAddTeamLabel: (label: Label) => void;
}) {
  const priorities = ['no_priority', 'urgent', 'high', 'medium', 'low'] as const;
  const [projectOpen, setProjectOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#5E6AD2');
  const [savingLabel, setSavingLabel] = useState(false);

  const assignedIds = new Set(issue.labels.map(l => l.id));

  function toggleLabel(labelId: string) {
    const next = assignedIds.has(labelId)
      ? [...assignedIds].filter(id => id !== labelId)
      : [...assignedIds, labelId];
    onUpdate({ labelIds: next });
  }

  async function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    setSavingLabel(true);
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: issue.teamId, name: newLabelName.trim(), color: newLabelColor }),
    });
    const { data: created } = await res.json() as { data: Label };
    // add to team labels list and immediately assign to this issue
    onAddTeamLabel(created);
    const next = [...assignedIds, created.id];
    onUpdate({ labelIds: next });
    setNewLabelName('');
    setNewLabelColor('#5E6AD2');
    setCreatingLabel(false);
    setSavingLabel(false);
  }

  return (
    <div className="w-64 shrink-0 border-l border-border h-full overflow-y-auto p-4 space-y-5">
      {/* Status */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Status</p>
        <div className="space-y-1">
          {statuses.map(s => (
            <button
              key={s.id}
              onClick={() => onUpdate({ statusId: s.id })}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${
                s.id === issue.statusId ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <StatusIcon type={s.type} color={s.color} className="h-3.5 w-3.5" />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Priority</p>
        <div className="space-y-1">
          {priorities.map(p => (
            <button
              key={p}
              onClick={() => onUpdate({ priority: p })}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${
                p === issue.priority ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <PriorityIcon priority={priorityToNumber(p)} className="w-3.5 h-3.5" />
              {priorityLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div>
        <button
          onClick={() => setLabelsOpen(o => !o)}
          className="flex items-center justify-between w-full text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide hover:text-foreground transition-colors"
        >
          <span>Labels</span>
          <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">
            {issue.labels.length > 0 ? issue.labels.length : 'None'}
          </span>
        </button>

        {/* Assigned labels */}
        {issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {issue.labels.map(l => (
              <button
                key={l.id}
                onClick={() => toggleLabel(l.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ backgroundColor: `${l.color}20`, color: l.color }}
                title="Click to remove"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
              </button>
            ))}
          </div>
        )}

        {/* Dropdown to add */}
        {labelsOpen && (
          <div className="border border-border rounded-md bg-popover shadow-sm overflow-hidden">
            {teamLabels.map(l => {
              const assigned = assignedIds.has(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => toggleLabel(l.id)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 transition-colors hover:bg-accent ${assigned ? 'bg-accent/50' : ''}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="flex-1 text-left text-xs">{l.name}</span>
                  {assigned && <span className="text-xs text-primary font-medium">✓</span>}
                </button>
              );
            })}

            {/* New label form */}
            {creatingLabel ? (
              <form onSubmit={handleCreateLabel} className="border-t border-border p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    placeholder="Label name"
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={e => setNewLabelColor(e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer border border-border p-0 bg-transparent"
                    title="Pick color"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="submit"
                    disabled={savingLabel || !newLabelName.trim()}
                    className="flex items-center gap-1 flex-1 justify-center py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    {savingLabel ? 'Creating…' : 'Create & assign'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreatingLabel(false); setNewLabelName(''); }}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreatingLabel(true)}
                className="flex items-center gap-2 w-full px-3 py-1.5 border-t border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Plus className="h-3 w-3" />
                New label
              </button>
            )}
          </div>
        )}
      </div>

      {/* Assignee */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Assignee</p>
        <div className="space-y-1">
          <button
            onClick={() => onUpdate({ assigneeId: null })}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${!issue.assigneeId ? 'bg-accent' : 'hover:bg-accent/50'}`}
          >
            <span className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/50 shrink-0" />
            <span className="text-muted-foreground">No assignee</span>
          </button>
          {teamUsers.map(u => {
            const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            return (
              <button
                key={u.id}
                onClick={() => onUpdate({ assigneeId: u.id })}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${u.id === issue.assigneeId ? 'bg-accent' : 'hover:bg-accent/50'}`}
              >
                {u.avatarUrl
                  ? <img src={u.avatarUrl} alt={u.name} className="h-5 w-5 rounded-full object-cover shrink-0" />
                  : <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shrink-0">{initials}</span>
                }
                {u.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Project */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Project</p>
        <div className="relative">
          <button
            onClick={() => setProjectOpen(o => !o)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors text-left"
          >
            <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className={issue.projectName ? 'text-foreground' : 'text-muted-foreground'}>
              {issue.projectName ?? 'No project'}
            </span>
          </button>
          {projectOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-md z-20 py-1">
              <button
                onClick={() => { onUpdate({ projectId: null }); setProjectOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                  !issue.projectId ? 'text-muted-foreground' : ''
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                No project
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onUpdate({ projectId: p.id }); setProjectOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                    p.id === issue.projectId ? 'bg-accent' : ''
                  }`}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? '#5E6AD2' }} />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div>
        <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Created</p>
        <p className="text-xs text-muted-foreground">
          {new Date(issue.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamLabels, setTeamLabels] = useState<Label[]>([]);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    async function load() {
      const [issueRes] = await Promise.all([fetch(`/api/issues/${id}`)]);
      const { data } = await issueRes.json() as { data: Issue };
      setIssue(data);
      setTitle(data.title);
      setDescription(data.description ?? '');

      const [statusRes, projectsRes, labelsRes, membersRes] = await Promise.all([
        fetch(`/api/statuses?teamId=${data.teamId}`),
        fetch(`/api/projects?teamId=${data.teamId}`),
        fetch(`/api/labels?teamId=${data.teamId}`),
        fetch(`/api/teams/${data.teamId}/members`),
      ]);
      const { data: s } = await statusRes.json() as { data: Status[] };
      const { data: proj } = await projectsRes.json() as { data: Project[] };
      const { data: lbl } = await labelsRes.json() as { data: Label[] };
      const { data: members } = await membersRes.json() as { data: User[] };
      setStatuses(s);
      setProjects(proj);
      setTeamLabels(lbl);
      setTeamUsers(members);
      setLoading(false);
    }
    load();
  }, [id]);

  async function saveTitle() {
    if (!issue || title === issue.title) return;
    await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setIssue(prev => prev ? { ...prev, title } : prev);
  }

  async function saveDescription() {
    if (!issue || description === (issue.description ?? '')) return;
    await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    setIssue(prev => prev ? { ...prev, description } : prev);
  }

  async function handleUpdate(fields: Record<string, unknown>) {
    await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    setIssue(prev => prev ? { ...prev, ...fields } as Issue : prev);

    // Refresh full issue to get updated status info
    const res = await fetch(`/api/issues/${id}`);
    const { data } = await res.json() as { data: Issue };
    setIssue(data);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSavingComment(true);
    const res = await fetch(`/api/issues/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment.trim() }),
    });
    const { data: newComment } = await res.json() as { data: Comment };
    setIssue(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : prev);
    setComment('');
    setSavingComment(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this issue?')) return;
    await fetch(`/api/issues/${id}`, { method: 'DELETE' });
    router.push('/issues');
  }

  if (loading || !issue) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border sticky top-0 bg-background z-10">
          <Link href="/issues" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Issues
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <StatusIcon type={issue.statusType} color={issue.statusColor} className="h-3.5 w-3.5" />
              {issue.statusName}
            </div>
            <button
              onClick={handleDelete}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Title */}
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            rows={1}
            className="w-full text-2xl font-semibold bg-transparent outline-none resize-none placeholder:text-muted-foreground leading-snug mb-6"
            placeholder="Issue title"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={4}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground text-foreground/80 leading-relaxed mb-8"
            placeholder="Add description…"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />

          {/* Comments */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Comments · {issue.comments.length}
            </p>

            <div className="space-y-4 mb-6">
              {issue.comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0 mt-0.5">
                    Y
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">You</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0 mt-2">
                Y
              </div>
              <div className="flex-1 border border-border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary/50">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Leave a comment…"
                  rows={3}
                  className="w-full p-3 text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
                />
                <div className="flex justify-end px-3 pb-2">
                  <button
                    type="submit"
                    disabled={savingComment || !comment.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    Comment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <Sidebar
        issue={issue}
        statuses={statuses}
        projects={projects}
        teamLabels={teamLabels}
        teamUsers={teamUsers}
        onUpdate={handleUpdate}
        onAddTeamLabel={label => setTeamLabels(prev => [...prev, label])}
      />
    </div>
  );
}
