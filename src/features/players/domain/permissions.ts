import { hasAnyRole, type ClubRole } from '@/features/clubs/domain/roles';

/** Cadastrar/editar/inativar (RLS: owner, manager, cashier, director). */
export function canManagePlayers(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager', 'cashier', 'director']);
}

/** Excluir (RPC delete_player: owner, manager). */
export function canDeletePlayers(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager']);
}
