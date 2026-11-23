import { hasAnyRole, type ClubRole } from '@/features/clubs/domain/roles';

/** Lançar, receber, estornar e finalizar (RPCs: owner, manager, cashier, director). */
export function canOperateLedger(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager', 'cashier', 'director']);
}

/** Reabrir sessão finalizada (RPC reopen_session: owner, manager). */
export function canReopenSessions(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager']);
}
