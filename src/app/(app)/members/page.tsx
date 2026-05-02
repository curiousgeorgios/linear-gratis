'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/contexts/team-context';
import { Plus, Trash2, X, Check } from 'lucide-react';

type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

function Avatar({ user }: { user: { name: string; avatarUrl: string | null } }) {
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
  ) : (
    <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
      {initials}
    </span>
  );
}

function AddMemberForm({
  teamId,
  existingIds,
  onAdded,
  onCancel,
}: {
  teamId: string;
  existingIds: Set<string>;
  onAdded: (m: Member) => void;
  onCancel: () => void;
}) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [role, setRole] = useState('member');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json() as Promise<{ data: User[] }>)
      .then(({ data }) => setAllUsers(data.filter(u => !existingIds.has(u.id))));
  }, [existingIds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedId, role }),
    });
    const res = await fetch(`/api/teams/${teamId}/members`);
    const { data } = await res.json() as { data: Member[] };
    const added = data.find(m => m.id === selectedId);
    if (added) onAdded(added);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4 bg-accent/30 rounded-lg border border-border">
      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="flex-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Select user…</option>
        {allUsers.map(u => (
          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
        ))}
      </select>
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        className="px-2.5 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="member">Member</option>
        <option value="owner">Owner</option>
      </select>
      <button
        type="submit"
        disabled={saving || !selectedId}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Check className="h-3.5 w-3.5" />
        {saving ? 'Adding…' : 'Add'}
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}

function MemberRow({
  member,
  teamId,
  onRemoved,
}: {
  member: Member;
  teamId: string;
  onRemoved: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  async function handleRemove() {
    await fetch(`/api/teams/${teamId}/members/${member.id}`, { method: 'DELETE' });
    onRemoved(member.id);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 rounded-lg group transition-colors">
      <Avatar user={member} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
        {member.role}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {confirming ? (
          <>
            <button onClick={handleRemove} className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors">
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

export default function MembersPage() {
  const { activeTeam } = useTeam();
  const [members, setMembers] = useState<Member[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTeam) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/teams/${activeTeam.id}/members`)
      .then(r => r.json() as Promise<{ data: Member[] }>)
      .then(({ data }) => { setMembers(data); setLoading(false); });
  }, [activeTeam]);

  const existingIds = new Set(members.map(m => m.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-sm font-semibold">Members</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeTeam?.name ?? ''} · {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add member
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 max-w-2xl mx-auto w-full">
        {adding && activeTeam && (
          <div className="mb-3">
            <AddMemberForm
              teamId={activeTeam.id}
              existingIds={existingIds}
              onAdded={m => { setMembers(prev => [...prev, m]); setAdding(false); }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {!activeTeam ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No team selected</p>
            <p className="text-xs mt-1">Join a team first from the <span className="text-primary">Teams</span> page.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No members yet</p>
            <button onClick={() => setAdding(true)} className="text-xs text-primary hover:underline mt-1">
              Add the first member
            </button>
          </div>
        ) : (
          members.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              teamId={activeTeam.id}
              onRemoved={id => setMembers(prev => prev.filter(m => m.id !== id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
