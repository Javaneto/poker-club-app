import {
  CLUB_ROLES,
  ROLE_LABELS,
  canEditClub,
  canManageMembers,
  canViewAuditLog,
  hasAnyRole,
  isClubRole,
} from './roles';

describe('papéis do clube', () => {
  it('tem rótulo em pt-BR para todo papel', () => {
    for (const role of CLUB_ROLES) expect(ROLE_LABELS[role]).toBeTruthy();
  });

  it('valida strings de papel', () => {
    expect(isClubRole('cashier')).toBe(true);
    expect(isClubRole('admin')).toBe(false);
    expect(isClubRole(undefined)).toBe(false);
  });

  it('hasAnyRole trata ausência de papel como sem permissão', () => {
    expect(hasAnyRole(null, ['owner'])).toBe(false);
    expect(hasAnyRole('manager', ['owner', 'manager'])).toBe(true);
  });

  it.each([
    ['owner', true, true, true],
    ['manager', false, true, true],
    ['cashier', false, false, false],
    ['director', false, false, false],
    ['dealer', false, false, false],
  ] as const)('%s: gerencia membros=%s, edita clube=%s, vê log=%s', (role, members, edit, log) => {
    expect(canManageMembers(role)).toBe(members);
    expect(canEditClub(role)).toBe(edit);
    expect(canViewAuditLog(role)).toBe(log);
  });
});
