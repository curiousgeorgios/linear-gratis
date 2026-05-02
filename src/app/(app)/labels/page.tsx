'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/contexts/team-context';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

type Label = { id: string; name: string; color: string; teamId: string };

const PRESET_COLORS = [
  '#EB5757', '#F2994A', '#F2C94C', '#26C281',
  '#2D9CDB', '#5E6AD2', '#9B51E0', '#219653',
  '#95A2B3', '#333333',
];

function ColorDot({ color, size = 4 }: { color: string; size?: number }) {
  return <span className={`h-${size} w-${size} rounded-full shrink-0 inline-block`} style={{ backgroundColor: color }} />;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full transition-all"
          style={{ backgroundColor: c, outline: value === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
        />
      ))}
      {/* Custom hex input */}
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-5 w-5 rounded cursor-pointer border-0 p-0 bg-transparent"
        title="Custom color"
      />
    </div>
  );
}

function LabelRow({
  label,
  onUpdated,
  onDeleted,
}: {
  label: Label;
  onUpdated: (l: Label) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  function startEdit() { setName(label.name); setColor(label.color); setEditing(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/labels/${label.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    const { data } = await res.json() as { data: Label };
    onUpdated(data);
    setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    await fetch(`/api/labels/${label.id}`, { method: 'DELETE' });
    onDeleted(label.id);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex items-center gap-3 px-4 py-3 bg-accent/30 rounded-lg border border-border">
        <ColorDot color={color} size={4} />
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded outline-none focus:ring-1 focus:ring-ring"
        />
        <ColorPicker value={color} onChange={setColor} />
        <button type="submit" disabled={saving || !name.trim()} className="p-1.5 text-primary hover:opacity-70 disabled:opacity-40 transition-opacity">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 rounded-lg group transition-colors">
      <ColorDot color={label.color} size={4} />
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: `${label.color}20`, color: label.color }}
      >
        {label.name}
      </span>
      <span className="flex-1" />
      <span className="text-xs font-mono text-muted-foreground">{label.color}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={startEdit} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {confirming ? (
          <>
            <button onClick={handleDelete} className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setConfirming(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function NewLabelForm({ teamId, onCreated, onCancel }: { teamId: string; onCreated: (l: Label) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, name: name.trim(), color }),
    });
    const { data } = await res.json() as { data: Label };
    onCreated(data);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 bg-accent/30 rounded-lg border border-border mb-2">
      <ColorDot color={color} size={4} />
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Label name"
        className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded outline-none focus:ring-1 focus:ring-ring"
      />
      <ColorPicker value={color} onChange={setColor} />
      <button type="submit" disabled={saving || !name.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
        <Check className="h-3.5 w-3.5" />
        {saving ? 'Saving…' : 'Create'}
      </button>
      <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}

export default function LabelsPage() {
  const { activeTeam } = useTeam();
  const [labelList, setLabelList] = useState<Label[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTeam) return;
    setLoading(true);
    fetch(`/api/labels?teamId=${activeTeam.id}`)
      .then(r => r.json() as Promise<{ data: Label[] }>)
      .then(({ data }) => { setLabelList(data); setLoading(false); });
  }, [activeTeam]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-semibold">Labels</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{activeTeam?.name ?? ''} · {labelList.length} label{labelList.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New label
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 max-w-2xl mx-auto w-full">
        {creating && activeTeam && (
          <NewLabelForm
            teamId={activeTeam.id}
            onCreated={l => { setLabelList(prev => [...prev, l]); setCreating(false); }}
            onCancel={() => setCreating(false)}
          />
        )}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
        ) : labelList.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No labels yet</p>
            <button onClick={() => setCreating(true)} className="text-xs text-primary hover:underline mt-1">Create your first label</button>
          </div>
        ) : (
          labelList.map(label => (
            <LabelRow
              key={label.id}
              label={label}
              onUpdated={updated => setLabelList(prev => prev.map(l => l.id === updated.id ? updated : l))}
              onDeleted={id => setLabelList(prev => prev.filter(l => l.id !== id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
