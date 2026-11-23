import { supabase } from '@/lib/supabase';
import { isClubRole, type ClubRole } from '../domain/roles';

export interface MyClub {
  id: string;
  name: string;
  role: ClubRole;
}

export interface ClubMember {
  userId: string;
  fullName: string;
  email: string;
  role: ClubRole;
  joinedAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface ClubInvitation {
  id: string;
  email: string;
  role: ClubRole;
  token: string;
  expiresAt: string;
}

export interface InvitationPreview {
  clubName: string;
  email: string;
  role: ClubRole;
  status: InvitationStatus;
}

function toRole(value: string): ClubRole {
  if (!isClubRole(value)) throw new Error(`Papel desconhecido: ${value}`);
  return value;
}

/** Clubes de que o usuário participa, com o papel dele em cada um. */
export async function fetchMyClubs(userId: string): Promise<MyClub[]> {
  const { data, error } = await supabase
    .from('club_members')
    .select('role, club:clubs(id, name)')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return data.flatMap((row) =>
    row.club ? [{ id: row.club.id, name: row.club.name, role: toRole(row.role) }] : [],
  );
}

export async function createClub(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_club', { club_name: name });
  if (error) throw error;
  return data;
}

export async function fetchClubMembers(clubId: string): Promise<ClubMember[]> {
  const { data, error } = await supabase.rpc('list_club_members', { target_club_id: clubId });
  if (error) throw error;
  return data.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: toRole(row.role),
    joinedAt: row.joined_at,
  }));
}

export async function updateMemberRole(clubId: string, userId: string, role: ClubRole) {
  const { error } = await supabase.rpc('update_club_member_role', {
    target_club_id: clubId,
    target_user_id: userId,
    new_role: role,
  });
  if (error) throw error;
}

export async function removeMember(clubId: string, userId: string) {
  const { error } = await supabase.rpc('remove_club_member', {
    target_club_id: clubId,
    target_user_id: userId,
  });
  if (error) throw error;
}

/** Convites pendentes e válidos do clube (só o dono enxerga, pela RLS). */
export async function fetchPendingInvitations(clubId: string): Promise<ClubInvitation[]> {
  const { data, error } = await supabase
    .from('club_invitations')
    .select('id, email, role, token, expires_at')
    .eq('club_id', clubId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    email: row.email,
    role: toRole(row.role),
    token: row.token,
    expiresAt: row.expires_at,
  }));
}

export async function createInvitation(
  clubId: string,
  email: string,
  role: ClubRole,
): Promise<ClubInvitation> {
  const { data, error } = await supabase.rpc('create_club_invitation', {
    target_club_id: clubId,
    invite_email: email,
    invite_role: role,
  });
  if (error) throw error;
  return {
    id: data.id,
    email: data.email,
    role: toRole(data.role),
    token: data.token,
    expiresAt: data.expires_at,
  };
}

export async function revokeInvitation(invitationId: string) {
  const { error } = await supabase.rpc('revoke_club_invitation', { invitation_id: invitationId });
  if (error) throw error;
}

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const { data, error } = await supabase.rpc('get_invitation_by_token', { invite_token: token });
  if (error) throw error;
  const row = data[0];
  if (!row) return null;
  const status = row.status;
  if (
    status !== 'pending' &&
    status !== 'accepted' &&
    status !== 'revoked' &&
    status !== 'expired'
  ) {
    throw new Error(`Status de convite desconhecido: ${status}`);
  }
  return { clubName: row.club_name, email: row.email, role: toRole(row.role), status };
}

export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_club_invitation', { invite_token: token });
  if (error) throw error;
  return data;
}

/** Link de convite para compartilhar (WhatsApp, e-mail…). */
export function invitationLink(token: string, origin = window.location.origin): string {
  return `${origin}/convite/${token}`;
}
