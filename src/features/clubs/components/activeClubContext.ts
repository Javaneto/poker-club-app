import { createContext, useContext } from 'react';
import type { MyClub } from '../api/clubsApi';

export interface ActiveClubState {
  club: MyClub;
  clubs: MyClub[];
  selectClub: (clubId: string) => void;
}

export const ActiveClubContext = createContext<ActiveClubState | null>(null);

/** Clube ativo. Só existe dentro das rotas protegidas por <RequireClub>. */
export function useActiveClub(): ActiveClubState {
  const value = useContext(ActiveClubContext);
  if (!value) throw new Error('useActiveClub precisa estar dentro de <RequireClub>');
  return value;
}
