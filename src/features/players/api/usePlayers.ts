import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlayerFormData } from '../schemas';
import {
  createPlayer,
  deletePlayer,
  fetchUpcomingBirthdays,
  getPlayer,
  listPlayers,
  setPlayerActive,
  updatePlayer,
  type PlayerListParams,
} from './playersApi';

export const playerKeys = {
  all: (clubId: string) => ['players', clubId] as const,
  list: (params: PlayerListParams) => [...playerKeys.all(params.clubId), 'list', params] as const,
  detail: (clubId: string, playerId: string) =>
    [...playerKeys.all(clubId), 'detail', playerId] as const,
  birthdays: (clubId: string, days: number) =>
    [...playerKeys.all(clubId), 'birthdays', days] as const,
};

export function usePlayerList(params: PlayerListParams) {
  return useQuery({
    queryKey: playerKeys.list(params),
    queryFn: () => listPlayers(params),
    // Mantém a página anterior na tela enquanto a próxima carrega (sem "piscar").
    placeholderData: keepPreviousData,
  });
}

export function usePlayer(clubId: string, playerId: string) {
  return useQuery({
    queryKey: playerKeys.detail(clubId, playerId),
    queryFn: () => getPlayer(playerId),
  });
}

export function useUpcomingBirthdays(clubId: string, days = 30) {
  return useQuery({
    queryKey: playerKeys.birthdays(clubId, days),
    queryFn: () => fetchUpcomingBirthdays(clubId, days),
  });
}

function useInvalidatePlayers(clubId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: playerKeys.all(clubId) });
}

export function useCreatePlayer(clubId: string) {
  const invalidate = useInvalidatePlayers(clubId);
  return useMutation({
    mutationFn: (data: PlayerFormData) => createPlayer(clubId, data),
    onSuccess: invalidate,
  });
}

export function useUpdatePlayer(clubId: string, playerId: string) {
  const invalidate = useInvalidatePlayers(clubId);
  return useMutation({
    mutationFn: (data: PlayerFormData) => updatePlayer(playerId, data),
    onSuccess: invalidate,
  });
}

export function useSetPlayerActive(clubId: string, playerId: string) {
  const invalidate = useInvalidatePlayers(clubId);
  return useMutation({
    mutationFn: (active: boolean) => setPlayerActive(playerId, active),
    onSettled: invalidate,
  });
}

export function useDeletePlayer(clubId: string) {
  const invalidate = useInvalidatePlayers(clubId);
  return useMutation({ mutationFn: deletePlayer, onSuccess: invalidate });
}
