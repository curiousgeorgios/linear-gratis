'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTeam } from '@/contexts/team-context';
import { Plus, Layers } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  startDate: string | null;
  targetDate: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#95A2B3',
  planned: '#5E6AD2',
  in_progress: '#F2C94C',
  completed: '#26C281',
  cancelled: '#95A2B3',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ProjectsPage() {
  const { activeTeam } = useTeam();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    if (!activeTeam) return;
    setLoading(true);
    const res = await fetch(`/api/projects?teamId=${activeTeam.id}`);
    const { data } = await res.json() as { data: Project[] };
    setProjects(data);
    setLoading(false);
  }, [activeTeam]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTeam || !newName.trim()) return;
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: activeTeam.id, name: newName.trim() }),
    });
    setNewName('');
    setCreating(false);
    load();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-semibold">Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{activeTeam?.name ?? ''}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New project
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="flex items-center gap-3 px-6 py-3 border-b border-border bg-accent/20">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Project name…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors">Save</button>
          <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <Layers className="h-8 w-8 opacity-30" />
            <p className="text-sm">No projects yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-accent/40 transition-colors"
              >
                <div
                  className="h-7 w-7 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${p.color ?? '#5E6AD2'}20` }}
                >
                  <Layers className="h-4 w-4" style={{ color: p.color ?? '#5E6AD2' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status] }}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  {p.targetDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.targetDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
