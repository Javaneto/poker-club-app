import { useMemo, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/authContext';
import { useMyClubs } from '@/features/clubs/api/useClubs';
import { resolveActiveClubId, useActiveClubStore } from '@/features/clubs/activeClubStore';
import {
  ActiveClubContext,
  useActiveClub,
  type ActiveClubState,
} from '@/features/clubs/components/activeClubContext';
import { hasAnyRole, type ClubRole } from '@/features/clubs/domain/roles';
import { FullScreenMessage } from './FullScreenMessage';

/** Exige sessão; sem ela manda para o login e volta depois. */
export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenMessage>Carregando…</FullScreenMessage>;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/entrar?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** Exige um clube; fornece o clube ativo. Sem clube, vai para o onboarding. */
export function RequireClub() {
  const { user } = useAuth();
  const userId = user?.id;
  const clubsQuery = useMyClubs(userId);
  const storedId = useActiveClubStore((state) =>
    userId ? state.selectedByUser[userId] : undefined,
  );
  const select = useActiveClubStore((state) => state.select);

  const value = useMemo<ActiveClubState | null>(() => {
    const clubs = clubsQuery.data ?? [];
    const activeId = resolveActiveClubId(clubs, storedId);
    const club = clubs.find((item) => item.id === activeId);
    if (!club || !userId) return null;
    return { club, clubs, selectClub: (clubId) => select(userId, clubId) };
  }, [clubsQuery.data, storedId, select, userId]);

  if (clubsQuery.isPending) return <FullScreenMessage>Carregando clubes…</FullScreenMessage>;
  if (clubsQuery.isError) {
    return (
      <FullScreenMessage>
        Não foi possível carregar seus clubes. Recarregue a página.
      </FullScreenMessage>
    );
  }
  if (!value) return <Navigate to="/novo-clube" replace />;

  return (
    <ActiveClubContext.Provider value={value}>
      <Outlet />
    </ActiveClubContext.Provider>
  );
}

/** Mostra o conteúdo só para os papéis permitidos no clube ativo. */
export function RequireRole({
  roles,
  children,
}: {
  roles: readonly ClubRole[];
  children: ReactNode;
}) {
  const { club } = useActiveClub();
  if (!hasAnyRole(club.role, roles)) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold">Sem permissão</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Seu papel neste clube não dá acesso a esta tela.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
