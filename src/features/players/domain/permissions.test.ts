import { canDeletePlayers, canManagePlayers } from './permissions';

describe('permissões de jogadores', () => {
  it.each([
    ['owner', true, true],
    ['manager', true, true],
    ['cashier', true, false],
    ['director', true, false],
    ['dealer', false, false],
    ['waiter', false, false],
  ] as const)('%s: gerencia=%s, exclui=%s', (role, manage, remove) => {
    expect(canManagePlayers(role)).toBe(manage);
    expect(canDeletePlayers(role)).toBe(remove);
  });
});
