import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Último clube escolhido por usuário (estado de UI, salvo no aparelho). */
interface ActiveClubState {
  selectedByUser: Record<string, string>;
  select: (userId: string, clubId: string) => void;
}

export const useActiveClubStore = create<ActiveClubState>()(
  persist(
    (set) => ({
      selectedByUser: {},
      select: (userId, clubId) =>
        set((state) => ({ selectedByUser: { ...state.selectedByUser, [userId]: clubId } })),
    }),
    {
      name: 'active-club',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // aba anônima / bloqueio: guarda só em memória
          const memory = new Map<string, string>();
          return {
            getItem: (key) => memory.get(key) ?? null,
            setItem: (key, value) => void memory.set(key, value),
            removeItem: (key) => void memory.delete(key),
          };
        }
      }),
    },
  ),
);

/** Escolhe o clube ativo: o salvo, se o usuário ainda for membro; senão o primeiro. */
export function resolveActiveClubId<T extends { id: string }>(
  clubs: readonly T[],
  storedId: string | undefined,
): string | null {
  if (storedId && clubs.some((club) => club.id === storedId)) return storedId;
  return clubs[0]?.id ?? null;
}
