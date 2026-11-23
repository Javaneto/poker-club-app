import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContext, type AuthState } from '@/features/auth/components/authContext';
import type { Session } from '@/features/auth/api/authApi';
import {
  ActiveClubContext,
  type ActiveClubState,
} from '@/features/clubs/components/activeClubContext';
import { RequireAuth, RequireRole } from './guards';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

function authState(overrides: Partial<AuthState>): AuthState {
  return { session: null, user: null, loading: false, recovering: false, ...overrides };
}

function ShowLocation() {
  const location = useLocation();
  return <p>em {location.pathname + location.search}</p>;
}

describe('RequireAuth', () => {
  it('manda para o login guardando a página de destino', () => {
    render(
      <AuthContext.Provider value={authState({})}>
        <MemoryRouter initialEntries={['/equipe']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/equipe" element={<p>Equipe</p>} />
            </Route>
            <Route path="/entrar" element={<ShowLocation />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText('em /entrar?next=%2Fequipe')).toBeInTheDocument();
  });

  it('mostra a página quando há sessão', () => {
    const session = { user: { id: 'u1' } } as unknown as Session;
    render(
      <AuthContext.Provider value={authState({ session })}>
        <MemoryRouter initialEntries={['/equipe']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/equipe" element={<p>Equipe</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText('Equipe')).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  function renderAs(role: ActiveClubState['club']['role']) {
    const value: ActiveClubState = {
      club: { id: 'c1', name: 'Clube', role },
      clubs: [],
      selectClub: () => undefined,
    };
    render(
      <ActiveClubContext.Provider value={value}>
        <RequireRole roles={['owner', 'manager']}>
          <p>Relatórios</p>
        </RequireRole>
      </ActiveClubContext.Provider>,
    );
  }

  it('libera papéis permitidos', () => {
    renderAs('manager');
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
  });

  it('bloqueia os demais com aviso', () => {
    renderAs('dealer');
    expect(screen.queryByText('Relatórios')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sem permissão' })).toBeInTheDocument();
  });
});
