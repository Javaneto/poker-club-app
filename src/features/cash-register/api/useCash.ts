import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { PaymentMethod } from '@/features/ledger/domain/result';
import {
  closeCashSession,
  createPaymentMethod,
  fetchCashHistory,
  fetchCashSession,
  fetchCashSummary,
  fetchCashTimeline,
  fetchOpenCashSession,
  fetchPaymentMethods,
  fetchRequireOpenCashSession,
  openCashSession,
  registerCashMovement,
  setRequireOpenCashSession,
  subscribeToCash,
  updatePaymentMethod,
} from './cashApi';

export const cashKeys = {
  all: (clubId: string) => ['cash', clubId] as const,
  open: (clubId: string) => [...cashKeys.all(clubId), 'open'] as const,
  session: (clubId: string, sessionId: string) =>
    [...cashKeys.all(clubId), 'session', sessionId] as const,
  summary: (clubId: string, sessionId: string) =>
    [...cashKeys.all(clubId), 'summary', sessionId] as const,
  timeline: (clubId: string, sessionId: string) =>
    [...cashKeys.all(clubId), 'timeline', sessionId] as const,
  history: (clubId: string, page: number) => [...cashKeys.all(clubId), 'history', page] as const,
  methods: (clubId: string) => ['payment-methods', clubId] as const,
  requireOpen: (clubId: string) => ['club-settings', clubId, 'require-open-cash'] as const,
};

export function useCashRealtime(clubId: string) {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeToCash(
        clubId,
        () => void queryClient.invalidateQueries({ queryKey: cashKeys.all(clubId) }),
      ),
    [clubId, queryClient],
  );
}

export function useOpenCashSession(clubId: string) {
  return useQuery({ queryKey: cashKeys.open(clubId), queryFn: () => fetchOpenCashSession(clubId) });
}

export function useCashSession(clubId: string, sessionId: string) {
  return useQuery({
    queryKey: cashKeys.session(clubId, sessionId),
    queryFn: () => fetchCashSession(sessionId),
  });
}

export function useCashSummary(clubId: string, sessionId: string | undefined) {
  return useQuery({
    queryKey: cashKeys.summary(clubId, sessionId ?? ''),
    queryFn: () => fetchCashSummary(sessionId ?? ''),
    enabled: Boolean(sessionId),
  });
}

export function useCashTimeline(clubId: string, sessionId: string | undefined) {
  return useQuery({
    queryKey: cashKeys.timeline(clubId, sessionId ?? ''),
    queryFn: () => fetchCashTimeline(sessionId ?? ''),
    enabled: Boolean(sessionId),
  });
}

export function useCashHistory(clubId: string, page: number) {
  return useQuery({
    queryKey: cashKeys.history(clubId, page),
    queryFn: () => fetchCashHistory(clubId, page),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentMethods(clubId: string) {
  return useQuery({
    queryKey: cashKeys.methods(clubId),
    queryFn: () => fetchPaymentMethods(clubId),
    staleTime: 5 * 60_000,
  });
}

function useInvalidateCash(clubId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cashKeys.all(clubId) });
}

export function useOpenCash(clubId: string) {
  const invalidate = useInvalidateCash(clubId);
  return useMutation({
    mutationFn: (openingCents: number) => openCashSession(clubId, openingCents),
    onSettled: invalidate,
  });
}

export function useCashMovement(clubId: string) {
  const invalidate = useInvalidateCash(clubId);
  return useMutation({
    mutationFn: (input: {
      sessionId: string;
      kind: 'withdrawal' | 'deposit';
      amountCents: number;
      note: string | null;
    }) => registerCashMovement(input.sessionId, input.kind, input.amountCents, input.note),
    onSettled: invalidate,
  });
}

export function useCloseCash(clubId: string) {
  const invalidate = useInvalidateCash(clubId);
  return useMutation({
    mutationFn: (input: { sessionId: string; countedCents: number; note: string | null }) =>
      closeCashSession(input.sessionId, input.countedCents, input.note),
    onSettled: invalidate,
  });
}

export function useCreatePaymentMethod(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; kind: PaymentMethod }) =>
      createPaymentMethod(clubId, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cashKeys.methods(clubId) }),
  });
}

export function useUpdatePaymentMethod(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name?: string; active?: boolean }) =>
      updatePaymentMethod(input.id, { name: input.name, active: input.active }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cashKeys.methods(clubId) }),
  });
}

export function useRequireOpenCash(clubId: string) {
  return useQuery({
    queryKey: cashKeys.requireOpen(clubId),
    queryFn: () => fetchRequireOpenCashSession(clubId),
  });
}

export function useSetRequireOpenCash(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (required: boolean) => setRequireOpenCashSession(clubId, required),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cashKeys.requireOpen(clubId) }),
  });
}
