'use client';

import { useEffect, useState } from 'react';
import { RoadmapTimeline, type TimelineProject } from '@/components/roadmap-timeline';
import { Plus, Map, ChevronDown } from 'lucide-react';

type Roadmap = {
  id: string;
  name: string;
  description: string | null;
  projects: TimelineProject[];
};

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const listRes = await fetch('/api/roadmaps');
    const { data: list } = await listRes.json() as { data: { id: string }[] };

    const detailed = await Promise.all(
      list.map(r => fetch(`/api/roadmaps/${r.id}`).then(res => res.json() as Promise<{ data: Roadmap }>).then(j => j.data))
    );

    setRoadmaps(detailed);
    if (detailed.length > 0 && !activeId) setActiveId(detailed[0].id);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const { data } = await res.json() as { data: { id: string } };
    setNewName('');
    setCreating(false);
    await load();
    setActiveId(data.id);
  }

  const active = roadmaps.find(r => r.id === activeId) ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Roadmap</h1>

          {/* Roadmap switcher */}
          {roadmaps.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-xs hover:bg-accent transition-colors"
              >
                {active?.name ?? 'Select roadmap'}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {open && (
                <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 py-1 min-w-40">
                  {roadmaps.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setActiveId(r.id); setOpen(false); }}
                      className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${r.id === activeId ? 'text-primary font-medium' : ''}`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setCreating(c => !c)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New roadmap
        </button>
      </div>

      {/* Quick create */}
      {creating && (
        <form onSubmit={handleCreate} className="flex items-center gap-3 px-6 py-3 border-b border-border bg-accent/20">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Roadmap name…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors">Save</button>
          <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        </form>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>
        ) : roadmaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Map className="h-10 w-10 opacity-20" />
            <p className="text-sm">No roadmaps yet</p>
            <button onClick={() => setCreating(true)} className="text-xs text-primary hover:underline">Create your first roadmap</button>
          </div>
        ) : active ? (
          <RoadmapTimeline projects={active.projects} />
        ) : null}
      </div>
    </div>
  );
}
