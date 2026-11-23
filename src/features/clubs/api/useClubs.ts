import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClubRole } from '../domain/roles';
import {
  acceptInvitation,
  createClub,
  createInvitation,
  fetchClubMembers,
  fetchInvitationPreview,
  fetchMyClubs,
  fetchPendingInvitations,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from './clubsApi';
import { clubKeys } from './queryKeys';

export function useMyClubs(userId: string | undefined) {
  return useQuery({
    queryKey: clubKeys.mine(userId ?? ''),
    queryFn: () => fetchMyClubs(userId ?? ''),
    enabled: Boolean(userId),
  });
}

export function useCreateClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClub,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...clubKeys.all, 'mine'] }),
  });
}

export function useClubMembers(clubId: string) {
  return useQuery({ queryKey: clubKeys.members(clubId), queryFn: () => fetchClubMembers(clubId) });
}

export function useUpdateMemberRole(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ClubRole }) =>
      updateMemberRole(clubId, userId, role),
    onSettled: () => queryClient.invalidateQueries({ queryKey: clubKeys.members(clubId) }),
  });
}

export function useRemoveMember(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(clubId, userId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: clubKeys.all }),
  });
}

export function usePendingInvitations(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: clubKeys.invitations(clubId),
    queryFn: () => fetchPendingInvitations(clubId),
    enabled,
  });
}

export function useCreateInvitation(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: ClubRole }) =>
      createInvitation(clubId, email, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clubKeys.invitations(clubId) }),
  });
}

export function useRevokeInvitation(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeInvitation,
    onSettled: () => queryClient.invalidateQueries({ queryKey: clubKeys.invitations(clubId) }),
  });
}

export function useInvitationPreview(token: string, enabled: boolean) {
  return useQuery({
    queryKey: clubKeys.invitation(token),
    queryFn: () => fetchInvitationPreview(token),
    enabled,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clubKeys.all }),
  });
}
