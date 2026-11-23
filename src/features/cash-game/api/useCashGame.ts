import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { TableEntryKind } from '../domain/chips';
import {
  closeTable,
  fetchClosedTables,
  fetchOpenTables,
  fetchTable,
  fetchTableActivity,
  fetchTablePlayers,
  fetchTableSummary,
  openTable,
  recordTableEntry,
  reverseActivity,
  seatPlayer,
  subscribeToCashGame,
  tableBuyIn,
  tableCashOut,
  unseatPlayer,
  type OpenTableInput,
  type PurchaseInput,
  type TableActivity,
} from './cashGameApi';

export const cashGameKeys = {
  all: (clubId: string) => ['cash-game', clubId] as const,
  open: (clubId: string) => [...cashGameKeys.all(clubId), 'open'] as const,
  closed: (clubId: string, page: number) => [...cashGameKeys.all(clubId), 'closed', page] as const,
  table: (clubId: string, tableId: string) =>
    [...cashGameKeys.all(clubId), 'table', tableId] as const,
  summary: (clubId: string, tableId: string) =>
    [...cashGameKeys.table(clubId, tableId), 'summary'] as const,
  players: (clubId: string, tableId: string) =>
    [...cashGameKeys.table(clubId, tableId), 'players'] as const,
  activity: (clubId: string, tableId: string, page: number) =>
    [...cashGameKeys.table(clubId, tableId), 'activity', page] as const,
};

/** Ao vivo: outras telas sentando, comprando ou lançando rake na mesma mesa. */
export function useCashGameRealtime(clubId: string) {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeToCashGame(
        clubId,
        () => void queryClient.invalidateQueries({ queryKey: cashGameKeys.all(clubId) }),
      ),
    [clubId, queryClient],
  );
}

export function useOpenTables(clubId: string) {
  return useQuery({ queryKey: cashGameKeys.open(clubId), queryFn: () => fetchOpenTables(clubId) });
}

export function useClosedTables(clubId: string, page: number) {
  return useQuery({
    queryKey: cashGameKeys.closed(clubId, page),
    queryFn: () => fetchClosedTables(clubId, page),
    placeholderData: keepPreviousData,
  });
}

export function useTable(clubId: string, tableId: string) {
  return useQuery({
    queryKey: cashGameKeys.table(clubId, tableId),
    queryFn: () => fetchTable(tableId),
  });
}

export function useTableSummary(clubId: string, tableId: string) {
  return useQuery({
    queryKey: cashGameKeys.summary(clubId, tableId),
    queryFn: () => fetchTableSummary(tableId),
  });
}

export function useTablePlayers(clubId: string, tableId: string) {
  return useQuery({
    queryKey: cashGameKeys.players(clubId, tableId),
    queryFn: () => fetchTablePlayers(tableId),
  });
}

export function useTableActivity(clubId: string, tableId: string, page: number) {
  return useQuery({
    queryKey: cashGameKeys.activity(clubId, tableId, page),
    queryFn: () => fetchTableActivity(tableId, page),
    placeholderData: keepPreviousData,
  });
}

/** Mesa mexe em fichas, conta do jogador e (compras pagas) no caixa. */
function useInvalidateTableMoney(clubId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cashGameKeys.all(clubId) }),
      queryClient.invalidateQueries({ queryKey: ['ledger', clubId] }),
      queryClient.invalidateQueries({ queryKey: ['players', clubId] }),
      queryClient.invalidateQueries({ queryKey: ['cash', clubId] }),
    ]);
}

export function useOpenTable(clubId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({
    mutationFn: (input: OpenTableInput) => openTable(clubId, input),
    onSettled: invalidate,
  });
}

export function useSeatPlayer(clubId: string, tableId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({
    mutationFn: (input: { playerId: string; purchase: PurchaseInput | null }) =>
      seatPlayer(tableId, input.playerId, input.purchase),
    onSettled: invalidate,
  });
}

export function useTableBuyIn(clubId: string, tableId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({
    mutationFn: (input: { playerId: string; purchase: PurchaseInput }) =>
      tableBuyIn(tableId, input.playerId, input.purchase),
    onSettled: invalidate,
  });
}

export function useTableCashOut(clubId: string, tableId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({
    mutationFn: (input: {
      playerId: string;
      amountCents: number;
      leaveTable: boolean;
      note: string | null;
    }) => tableCashOut(tableId, input.playerId, input),
    onSettled: invalidate,
  });
}

export function useUnseatPlayer(clubId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({ mutationFn: unseatPlayer, onSettled: invalidate });
}

export function useRecordTableEntry(clubId: string, tableId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({
    mutationFn: (input: { kind: TableEntryKind; amountCents: number; note: string | null }) =>
      recordTableEntry(tableId, input),
    onSettled: invalidate,
  });
}

export function useReverseActivity(clubId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({
    mutationFn: (input: { item: Pick<TableActivity, 'source' | 'id'>; note: string }) =>
      reverseActivity(input.item, input.note),
    onSettled: invalidate,
  });
}

export function useCloseTable(clubId: string, tableId: string) {
  const invalidate = useInvalidateTableMoney(clubId);
  return useMutation({
    mutationFn: (note: string | null) => closeTable(tableId, note),
    onSettled: invalidate,
  });
}
