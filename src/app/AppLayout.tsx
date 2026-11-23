import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useSignOut } from '@/features/auth/api/useAuthMutations';
import { useAuth } from '@/features/auth/components/authContext';
import { ClubSwitcher } from '@/features/clubs/components/ClubSwitcher';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { ROLE_LABELS } from '@/features/clubs/domain/roles';
import { cn } from '@/lib/cn';
import { MobileNav } from './MobileNav';
import { visibleNavItems } from './navigation';
import { useTheme } from './useTheme';

/** Layout das telas internas: menu lateral no desktop, barra inferior no celular. */
export function AppLayout() {
  const { user } = useAuth();
  const { club } = useActiveClub();
  const signOut = useSignOut();
  const { theme, toggle } = useTheme();
  const items = visibleNavItems(club.role);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-border bg-surface hidden border-r md:flex md:flex-col">
        <div className="p-4">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Clube de Poker
          </p>
        </div>
        <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-1 px-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                  isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-border border-t p-3 text-sm">
          <p className="truncate font-medium">{user?.fullName || user?.email}</p>
          <p className="text-muted-foreground">{ROLE_LABELS[club.role]}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="border-border bg-background/95 sticky top-0 z-30 flex items-center gap-2 border-b px-4 py-2 backdrop-blur">
          <ClubSwitcher />
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>
            <Button variant="ghost" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
              Sair
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4">
          <Outlet />
        </main>
      </div>

      <MobileNav items={items} />
    </div>
  );
}
