'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTeam } from '@/contexts/team-context';
import { useUser } from '@/contexts/user-context';
import { Plus, Pencil, Trash2, X, Check, LogIn, LogOut } from 'lucide-react';

type Team = {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  color: string;
};

const COLORS = [
  '#5E6AD2', '#26C281', '#EB5757', '#F2C94C',
  '#F2994A', '#9B51E0', '#2D9CDB', '#219653',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full transition-all"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  );
}

function TeamForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Team>;
  onSave: (data: { name: string; identifier: string; description: string; color: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [identifier, setIdentifier] = useState(initial?.identifier ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    if (!initial?.identifier) {
      setIdentifier(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !identifier.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), identifier: identifier.trim(), description: description.trim(), color });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-accent/30 rounded-lg border border-border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            autoFocus
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Engineering"
            className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Identifier</label>
          <input
            value={identifier}
            onChange={e => setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
            placeholder="ENG"
            className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring font-mono"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim() || !identifier.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function TeamRow({
  team,
  isMember,
  onUpdated,
  onDeleted,
  onJoin,
  onLeave,
}: {
  team: Team;
  isMember: boolean;
  onUpdated: (t: Team) => void;
  onDeleted: (id: string) => void;
  onJoin: (teamId: string) => Promise<void>;
  onLeave: (teamId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSave(data: { name: string; identifier: string; description: string; color: string }) {
    const res = await fetch(`/api/teams/${team.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const { data: updated } = await res.json() as { data: Team };
    onUpdated(updated);
    setEditing(false);
  }

  async function handleDelete() {
    await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
    onDeleted(team.id);
  }

  async function handleJoin() {
    setBusy(true);
    await onJoin(team.id);
    setBusy(false);
  }

  async function handleLeave() {
    setBusy(true);
    await onLeave(team.id);
    setBusy(false);
    setConfirmingLeave(false);
  }

  if (editing) {
    return (
      <div className="mb-2">
        <TeamForm initial={team} onSave={handleSave} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 rounded-lg group transition-colors">
      <span
        className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: team.color }}
      >
        {team.identifier.slice(0, 2)}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{team.name}</p>
        {team.description && (
          <p className="text-xs text-muted-foreground truncate">{team.description}</p>
        )}
      </div>

      <span className="text-xs font-mono text-muted-foreground">{team.identifier}</span>

      {/* Join / Leave */}
      {isMember ? (
        confirmingLeave ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Leave?</span>
            <button onClick={handleLeave} disabled={busy} className="text-destructive font-medium hover:underline disabled:opacity-50">Yes</button>
            <button onClick={() => setConfirmingLeave(false)} className="text-muted-foreground hover:text-foreground">No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingLeave(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut className="h-3 w-3" />
            Leave
          </button>
        )
      ) : (
        <button
          onClick={handleJoin}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
        >
          <LogIn className="h-3 w-3" />
          Join
        </button>
      )}

      {/* Edit / Delete */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {confirmingDelete ? (
          <>
            <button onClick={handleDelete} className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { activeTeam, refreshTeams } = useTeam();
  const { currentUser } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberTeamIds, setMemberTeamIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const loadMemberships = useCallback(async () => {
    if (!currentUser) return;
    const res = await fetch(`/api/users/${currentUser.id}/teams`);
    const { data } = await res.json() as { data: { id: string }[] };
    setMemberTeamIds(new Set(data.map(t => t.id)));
  }, [currentUser]);

  useEffect(() => {
    fetch('/api/teams')
      .then(r => r.json() as Promise<{ data: Team[] }>)
      .then(({ data }) => setTeams(data));
  }, []);

  useEffect(() => { loadMemberships(); }, [loadMemberships]);

  async function handleCreate(data: { name: string; identifier: string; description: string; color: string }) {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const { data: created } = await res.json() as { data: Team };
    setTeams(prev => [...prev, created]);
    setCreating(false);
  }

  function handleUpdated(updated: Team) {
    setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
    if (activeTeam?.id === updated.id) setActiveTeam(updated);
  }

  function handleDeleted(id: string) {
    setTeams(prev => prev.filter(t => t.id !== id));
    setMemberTeamIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    refreshTeams();
  }

  async function handleJoin(teamId: string) {
    if (!currentUser) return;
    await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, role: 'member' }),
    });
    setMemberTeamIds(prev => new Set([...prev, teamId]));
    refreshTeams();
  }

  async function handleLeave(teamId: string) {
    if (!currentUser) return;
    await fetch(`/api/teams/${teamId}/members/${currentUser.id}`, { method: 'DELETE' });
    setMemberTeamIds(prev => { const s = new Set(prev); s.delete(teamId); return s; });
    refreshTeams();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-semibold">Teams</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New team
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 max-w-2xl mx-auto w-full">
        {creating && (
          <div className="mb-3">
            <TeamForm onSave={handleCreate} onCancel={() => setCreating(false)} />
          </div>
        )}
        {teams.map(team => (
          <TeamRow
            key={team.id}
            team={team}
            isMember={memberTeamIds.has(team.id)}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onJoin={handleJoin}
            onLeave={handleLeave}
          />
        ))}
        {teams.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No teams yet</p>
            <button onClick={() => setCreating(true)} className="text-xs text-primary hover:underline mt-1">
              Create your first team
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
