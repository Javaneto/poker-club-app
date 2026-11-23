import { describe, expect, it } from 'vitest';
import { canOperateCashGame } from './permissions';

describe('canOperateCashGame', () => {
  it('dono, gerente, caixa, diretor e dealer operam a mesa', () => {
    for (const role of ['owner', 'manager', 'cashier', 'director', 'dealer'] as const) {
      expect(canOperateCashGame(role)).toBe(true);
    }
  });

  it('garçom e sem papel não operam', () => {
    expect(canOperateCashGame('waiter')).toBe(false);
    expect(canOperateCashGame(null)).toBe(false);
  });
});
