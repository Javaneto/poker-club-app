import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import type { EntryFormData } from '../schemas';
import {
  closeAllSessions,
  closeSession,
  fetchClosedSessions,
  fetchOpenEntries,
  fetchOpenSessions,
  fetchPlayerEntries,
  fetchReceipt,
  recordMovement,
  reopenSession,
  reverseEntry,
  subscribeToLedger,
} from './ledgerApi';

export const ledgerKeys = {
  all: (clubId: string) => ['ledger', clubId] as const,
  openSessions: (clubId: string) => [...ledgerKeys.all(clubId), 'open-sessions'] as const,
  openEntries: (clubId: string, page: number) =>
    [...ledgerKeys.all(clubId), 'open-entries', page] as const,
  closedSessions: (clubId: string, playerId: string | undefined, page: number) =>
    [...ledgerKeys.all(clubId), 'closed-sessions', playerId ?? 'all', page] as const,
  playerEntries: (clubId: string, playerId: string, page: number) =>
    [...ledgerKeys.all(clubId), 'player-entries', playerId, page] as const,
  receipt: (clubId: string, entryId: string) =>
    [...ledgerKeys.all(clubId), 'receipt', entryId] as const,
};

/** Lançamentos mexem em saldos de jogadores: invalida o ledger e a lista de jogadores. */
function invalidateMoney(queryClient: QueryClient, clubId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ledgerKeys.all(clubId) }),
    queryClient.invalidateQueries({ queryKey: ['players', clubId] }),
  ]);
}

/** Mantém as telas de dinheiro atualizadas ao vivo (outros caixas/dispositivos). */
export function useLedgerRealtime(clubId: string) {
  const queryClient = useQueryClient();
  useEffect(
    () => subscribeToLedger(clubId, () => void invalidateMoney(queryClient, clubId)),
    [clubId, queryClient],
  );
}

export function useOpenSessions(clubId: string) {
  return useQuery({
    queryKey: ledgerKeys.openSessions(clubId),
    queryFn: () => fetchOpenSessions(clubId),
  });
}

export function useOpenEntries(clubId: string, page: number) {
  return useQuery({
    queryKey: ledgerKeys.openEntries(clubId, page),
    queryFn: () => fetchOpenEntries(clubId, page),
    placeholderData: keepPreviousData,
  });
}

export function useClosedSessions(clubId: string, page: number, playerId?: string) {
  return useQuery({
    queryKey: ledgerKeys.closedSessions(clubId, playerId, page),
    queryFn: () => fetchClosedSessions({ clubId, playerId, page }),
    placeholderData: keepPreviousData,
  });
}

export function usePlayerEntries(clubId: string, playerId: string, page: number) {
  return useQuery({
    queryKey: ledgerKeys.playerEntries(clubId, playerId, page),
    queryFn: () => fetchPlayerEntries(playerId, page),
    placeholderData: keepPreviousData,
  });
}

export function useReceipt(clubId: string, entryId: string) {
  return useQuery({
    queryKey: ledgerKeys.receipt(clubId, entryId),
    queryFn: () => fetchReceipt(entryId),
  });
}

export function useRecordMovement(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, data }: { playerId: string; data: EntryFormData }) =>
      recordMovement(playerId, data),
    onSettled: () => invalidateMoney(queryClient, clubId),
  });
}

export function useReverseEntry(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, note }: { entryId: string; note: string }) =>
      reverseEntry(entryId, note),
    onSettled: () => invalidateMoney(queryClient, clubId),
  });
}

export function useCloseSession(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeSession,
    onSettled: () => invalidateMoney(queryClient, clubId),
  });
}

export function useCloseAllSessions(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => closeAllSessions(clubId),
    onSettled: () => invalidateMoney(queryClient, clubId),
  });
}

export function useReopenSession(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reopenSession,
    onSettled: () => invalidateMoney(queryClient, clubId),
  });
}
