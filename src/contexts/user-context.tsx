'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type UserContextValue = {
  currentUser: User | null;
  loading: boolean;
  setCurrentUser: (u: User | null) => void;
};

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  loading: true,
  setCurrentUser: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json() as Promise<{ data: User[] }>)
      .then(({ data }) => {
        const savedId = localStorage.getItem('current-user-id');
        const saved = data.find(u => u.id === savedId) ?? data[0] ?? null;
        setCurrentUserState(saved);
        if (saved) localStorage.setItem('current-user-id', saved.id);
      })
      .finally(() => setLoading(false));
  }, []);

  function setCurrentUser(u: User | null) {
    setCurrentUserState(u);
    if (u) localStorage.setItem('current-user-id', u.id);
    else localStorage.removeItem('current-user-id');
  }

  return (
    <UserContext.Provider value={{ currentUser, loading, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
