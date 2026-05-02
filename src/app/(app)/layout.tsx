import { TeamProvider } from '@/contexts/team-context';
import { UserProvider } from '@/contexts/user-context';
import { Sidebar } from '@/components/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <TeamProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </TeamProvider>
    </UserProvider>
  );
}
