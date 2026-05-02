'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusIcon } from '@/components/status-icon';
import { PriorityIcon } from '@/components/priority-icon';
import { priorityToNumber } from '@/lib/priority';
import { ArrowLeft, Trash2, X, ChevronDown } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';

type Issue = {
  id: string;
  title: string;
  priority: string;
  statusName: string;
  statusColor: string;
  statusType: string;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  startDate: string | null;
  targetDate: string | null;
};

type Roadmap = {
  id: string;
  name: string;
};

const STATUS_OPTIONS = ['backlog', 'planned', 'in_progress', 'completed', 'cancelled'] as const;
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedRoadmaps, setAssignedRoadmaps] = useState<Roadmap[]>([]);
  const [allRoadmaps, setAllRoadmaps] = useState<Roadmap[]>([]);
  const [roadmapPickerOpen, setRoadmapPickerOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [projRes, issuesRes, roadmapsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/issues?projectId=${id}`),
        fetch(`/api/roadmaps`),
      ]);
      const { data: proj } = await projRes.json() as { data: Project };
      const { data: iss } = await issuesRes.json() as { data: Issue[] };
      const { data: allR } = await roadmapsRes.json() as { data: Roadmap[] };
      setProject(proj);
      setIssues(iss);
      setName(proj.name);
      setDescription(proj.description ?? '');
      setAllRoadmaps(allR);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    async function loadAssigned() {
      const res = await fetch(`/api/projects/${id}/roadmaps`);
      if (res.ok) {
        const { data } = await res.json() as { data: Roadmap[] };
        setAssignedRoadmaps(data);
      }
    }
    loadAssigned();
  }, [id]);

  async function saveName() {
    if (!project || name === project.name) return;
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setProject(p => p ? { ...p, name } : p);
  }

  async function saveDescription() {
    if (!project || description === (project.description ?? '')) return;
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    setProject(p => p ? { ...p, description } : p);
  }

  async function setStatus(status: string) {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setProject(p => p ? { ...p, status } : p);
  }

  async function handleDelete() {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/projects');
  }

  async function addToRoadmap(roadmapId: string) {
    await fetch(`/api/roadmaps/${roadmapId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id }),
    });
    const added = allRoadmaps.find(r => r.id === roadmapId);
    if (added) setAssignedRoadmaps(prev => [...prev, added]);
    setRoadmapPickerOpen(false);
  }

  async function removeFromRoadmap(roadmapId: string) {
    await fetch(`/api/roadmaps/${roadmapId}/projects/${id}`, { method: 'DELETE' });
    setAssignedRoadmaps(prev => prev.filter(r => r.id !== roadmapId));
  }

  const unassignedRoadmaps = allRoadmaps.filter(r => !assignedRoadmaps.some(a => a.id === r.id));

  if (loading || !project) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border sticky top-0 bg-background z-10">
        <Link href="/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <button onClick={handleDelete} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-2xl mx-auto w-full">
          <textarea
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            rows={1}
            className="w-full text-2xl font-semibold bg-transparent outline-none resize-none mb-4"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={3}
            placeholder="Add description…"
            className="w-full text-sm bg-transparent outline-none resize-none text-foreground/80 placeholder:text-muted-foreground mb-8"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Issues · {issues.length}
          </p>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-6 text-center">No issues in this project</p>
            ) : issues.map(issue => (
              <Link key={issue.id} href={`/issues/${issue.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors">
                <PriorityIcon priority={priorityToNumber(issue.priority)} className="w-3.5 h-3.5 shrink-0" />
                <StatusIcon type={issue.statusType} color={issue.statusColor} className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm truncate">{issue.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{issue.statusName}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="w-56 shrink-0 border-l border-border p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Status</p>
            <div className="space-y-1">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${project.status === s ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <DatePicker
            label="Start date"
            value={project.startDate}
            onChange={async iso => {
              await fetch(`/api/projects/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: iso }),
              });
              setProject(p => p ? { ...p, startDate: iso } : p);
            }}
          />
          <DatePicker
            label="Target date"
            value={project.targetDate}
            onChange={async iso => {
              await fetch(`/api/projects/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetDate: iso }),
              });
              setProject(p => p ? { ...p, targetDate: iso } : p);
            }}
          />

          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Roadmaps</p>
            <div className="space-y-1">
              {assignedRoadmaps.map(r => (
                <div key={r.id} className="flex items-center justify-between group px-2 py-1 rounded hover:bg-accent/50">
                  <Link href="/roadmap" className="text-sm truncate hover:underline">{r.name}</Link>
                  <button
                    onClick={() => removeFromRoadmap(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity ml-1 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="relative mt-1">
              <button
                onClick={() => setRoadmapPickerOpen(o => !o)}
                disabled={unassignedRoadmaps.length === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1"
              >
                <ChevronDown className="h-3 w-3" />
                Add to roadmap
              </button>
              {roadmapPickerOpen && unassignedRoadmaps.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-md z-20 py-1">
                  {unassignedRoadmaps.map(r => (
                    <button
                      key={r.id}
                      onClick={() => addToRoadmap(r.id)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
