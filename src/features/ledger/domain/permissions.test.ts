import { canOperateLedger, canReopenSessions } from './permissions';

describe('permissões da conta do jogador', () => {
  it.each([
    ['owner', true, true],
    ['manager', true, true],
    ['cashier', true, false],
    ['director', true, false],
    ['dealer', false, false],
    ['waiter', false, false],
  ] as const)('%s: opera=%s, reabre=%s', (role, operate, reopen) => {
    expect(canOperateLedger(role)).toBe(operate);
    expect(canReopenSessions(role)).toBe(reopen);
  });
});
