/** Papéis no clube e o que cada um pode fazer. Espelha as políticas RLS do banco. */

export const CLUB_ROLES = ['owner', 'manager', 'cashier', 'director', 'dealer'] as const;

export type ClubRole = (typeof CLUB_ROLES)[number];

export const ROLE_LABELS: Record<ClubRole, string> = {
  owner: 'Dono',
  manager: 'Gerente',
  cashier: 'Caixa',
  director: 'Diretor de torneio',
  dealer: 'Dealer',
};

export function isClubRole(value: unknown): value is ClubRole {
  return typeof value === 'string' && (CLUB_ROLES as readonly string[]).includes(value);
}

export function hasAnyRole(
  role: ClubRole | null | undefined,
  allowed: readonly ClubRole[],
): boolean {
  return role != null && allowed.includes(role);
}

/** Convidar, trocar papel e remover membros (RPCs exigem owner). */
export function canManageMembers(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner']);
}

/** Editar nome do clube e configurações (RLS: owner/manager). */
export function canEditClub(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager']);
}

/** Ler o log de auditoria (RLS: owner/manager). */
export function canViewAuditLog(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager']);
}
