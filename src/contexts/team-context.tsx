'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useUser } from '@/contexts/user-context';

export type Team = {
  id: string;
  name: string;
  identifier: string;
  color: string;
};

type TeamContextValue = {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => void;
  refreshTeams: () => void;
};

const TeamContext = createContext<TeamContextValue>({
  teams: [],
  activeTeam: null,
  setActiveTeam: () => {},
  refreshTeams: () => {},
});

export function TeamProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);

  const loadTeams = useCallback(async () => {
    const url = currentUser
      ? `/api/users/${currentUser.id}/teams`
      : '/api/teams';
    const res = await fetch(url);
    const { data } = await res.json() as { data: Team[] };
    setTeams(data);
    setActiveTeamState(prev => {
      const savedId = localStorage.getItem('active-team-id');
      // keep active team if still in the list, otherwise pick first
      const stillMember = data.find(t => t.id === (prev?.id ?? savedId));
      const next = stillMember ?? data[0] ?? null;
      if (next) localStorage.setItem('active-team-id', next.id);
      return next;
    });
  }, [currentUser]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  function setActiveTeam(team: Team) {
    setActiveTeamState(team);
    localStorage.setItem('active-team-id', team.id);
  }

  return (
    <TeamContext.Provider value={{ teams, activeTeam, setActiveTeam, refreshTeams: loadTeams }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
