import { hasAnyRole, type ClubRole } from '@/features/clubs/domain/roles';

/** Abrir, sangria, suprimento e fechar o caixa (RPCs: owner, manager, cashier). */
export function canOperateCash(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager', 'cashier']);
}
