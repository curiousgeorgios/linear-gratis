'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTeam, type Team } from '@/contexts/team-context';
import { useUser } from '@/contexts/user-context';
import {
  CheckCircle2,
  Layers,
  CalendarClock,
  LayoutList,
  Settings,
  ChevronDown,
  ChevronRight,
  Map,
  Users,
  UserCircle2,
  UserPlus,
  X,
  Pencil,
  Check,
  Tag,
} from 'lucide-react';

function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-accent text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
      {label}
    </p>
  );
}

type UserEntry = { id: string; name: string; email: string; avatarUrl: string | null };

function UserAvatar({ user, size = 6 }: { user: { name: string; avatarUrl: string | null }; size?: number }) {
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const cls = `h-${size} w-${size} rounded-full shrink-0`;
  return user.avatarUrl
    ? <img src={user.avatarUrl} alt={user.name} className={`${cls} object-cover`} />
    : <span className={`${cls} bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground`}>{initials}</span>;
}

function RegisterForm({ onDone, onCancel }: { onDone: (u: UserEntry) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    });
    const { data } = await res.json() as { data: UserEntry };
    onDone(data);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-2 space-y-1.5 border-t border-border">
      <p className="text-xs font-medium text-muted-foreground px-1">New user</p>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
        className="w-full px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-ring"
      />
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="w-full px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex gap-1.5 pt-0.5">
        <button
          type="submit"
          disabled={saving || !name.trim() || !email.trim()}
          className="flex-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function UserDisplay() {
  const { currentUser, loading, setCurrentUser } = useUser();
  const [open, setOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserEntry[]>([]);
  const [registering, setRegistering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  function openMenu() {
    fetch('/api/users')
      .then(r => r.json() as Promise<{ data: UserEntry[] }>)
      .then(({ data }) => setAllUsers(data));
    setOpen(true);
    setRegistering(false);
    setConfirmDelete(false);
    setEditingName(null);
  }

  async function handleDelete() {
    if (!currentUser) return;
    await fetch(`/api/users/${currentUser.id}`, { method: 'DELETE' });
    const next = allUsers.find(u => u.id !== currentUser.id) ?? null;
    setCurrentUser(next);
    setOpen(false);
    setConfirmDelete(false);
  }

  function handleSwitch(u: UserEntry) {
    setCurrentUser(u);
    setOpen(false);
  }

  function handleRegistered(u: UserEntry) {
    setCurrentUser(u);
    setOpen(false);
    setRegistering(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentUser) {
    if (registering) {
      return <RegisterForm onDone={handleRegistered} onCancel={() => setRegistering(false)} />;
    }
    return (
      <button
        onClick={() => setRegistering(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
      >
        <UserPlus className="h-4 w-4 shrink-0" />
        <span className="text-sm">Register</span>
      </button>
    );
  }

  const others = allUsers.filter(u => u.id !== currentUser.id);

  return (
    <div className="relative">
      <button
        onClick={openMenu}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent/50 rounded-md transition-colors"
      >
        <UserAvatar user={currentUser} size={6} />
        <span className="text-sm font-medium truncate flex-1 text-left">{currentUser.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 py-1 overflow-hidden">
            {/* Current user info */}
            {/* All users list */}
            <div className="py-1">
              {/* Current user row with edit */}
              {editingName !== null ? (
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!editingName.trim()) return;
                    setSavingName(true);
                    const res = await fetch(`/api/users/${currentUser.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: editingName.trim() }),
                    });
                    const { data } = await res.json() as { data: UserEntry };
                    setCurrentUser(data);
                    setAllUsers(prev => prev.map(u => u.id === data.id ? data : u));
                    setEditingName(null);
                    setSavingName(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5"
                >
                  <UserAvatar user={currentUser} size={5} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      className="w-full px-1.5 py-0.5 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground truncate px-1">{currentUser.email}</p>
                  </div>
                  <button type="submit" disabled={savingName || !editingName.trim()} className="p-1 text-primary hover:opacity-70 disabled:opacity-40 transition-opacity">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setEditingName(null)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 group">
                  <UserAvatar user={currentUser} size={5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => { setEditingName(currentUser.name); setRegistering(false); setConfirmDelete(false); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Other users — click to switch */}
              {others.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleSwitch(u)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent transition-colors"
                >
                  <UserAvatar user={u} size={5} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-border py-1">
              <button
                onClick={() => { setRegistering(r => !r); setConfirmDelete(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                Register new user
              </button>

              {confirmDelete ? (
                <div className="px-3 py-1.5 flex items-center gap-2">
                  <span className="text-xs text-destructive flex-1">Delete {currentUser.name}?</span>
                  <button onClick={handleDelete} className="text-xs text-destructive font-medium hover:underline">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:text-foreground">No</button>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmDelete(true); setRegistering(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                >
                  <X className="h-3.5 w-3.5 shrink-0" />
                  Delete this user
                </button>
              )}
            </div>

            {registering && (
              <RegisterForm
                onDone={handleRegistered}
                onCancel={() => setRegistering(false)}
              />
            )}
          </div>
        </>
      )}

    </div>
  );
}

function TeamSection({ team, teams, onSwitch }: { team: Team; teams: Team[]; onSwitch: (t: Team) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-1.5 flex-1 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/50 rounded-md transition-colors min-w-0"
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
          <span
            className="h-4 w-4 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: team.color }}
          >
            {team.identifier.slice(0, 2)}
          </span>
          <span className="truncate">{team.name}</span>
        </button>

        {teams.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              className="p-1 rounded hover:bg-accent/50 transition-colors"
            >
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
            {switcherOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-popover border border-border rounded-md shadow-lg z-50 py-1">
                {teams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onSwitch(t); setSwitcherOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span
                      className="h-4 w-4 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.identifier.slice(0, 2)}
                    </span>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="ml-3 pl-2 border-l border-border/50 space-y-0.5 mt-0.5">
          <NavItem href="/issues"    icon={CheckCircle2}  label="Issues" />
          <NavItem href="/projects"  icon={Layers}        label="Projects" />
          <NavItem href="/schedules" icon={CalendarClock} label="Schedules" />
          <NavItem href="/views"     icon={LayoutList}    label="Views" />
          <NavItem href="/labels"    icon={Tag}           label="Labels" />
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { teams, activeTeam, setActiveTeam } = useTeam();

  return (
    <aside className="w-60 shrink-0 border-r border-border h-screen flex flex-col bg-sidebar overflow-y-auto">
      {/* Current user */}
      <div className="p-2 border-b border-border">
        <UserDisplay />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        <SectionLabel label="Workspace" />
        <NavItem href="/members" icon={Users}       label="Members" />
        <NavItem href="/teams"   icon={UserCircle2} label="Teams" />
        <NavItem href="/roadmap" icon={Map}         label="Roadmap" />

        {activeTeam && (
          <>
            <SectionLabel label="Your teams" />
            <TeamSection team={activeTeam} teams={teams} onSwitch={setActiveTeam} />
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-border">
        <NavItem href="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  );
}
