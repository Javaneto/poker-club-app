import { hasAnyRole, type ClubRole } from '@/features/clubs/domain/roles';

/** Abrir/encerrar mesa, sentar, compras, devoluções, rake, capilé e despesas (RPCs da mesa). */
export function canOperateCashGame(role: ClubRole | null | undefined): boolean {
  return hasAnyRole(role, ['owner', 'manager', 'cashier', 'director', 'dealer']);
}
