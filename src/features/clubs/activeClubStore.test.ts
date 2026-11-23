import { resolveActiveClubId } from './activeClubStore';

const clubs = [{ id: 'a' }, { id: 'b' }];

describe('resolveActiveClubId', () => {
  it('usa o clube salvo quando o usuário ainda é membro', () => {
    expect(resolveActiveClubId(clubs, 'b')).toBe('b');
  });

  it('cai no primeiro clube quando o salvo não existe mais', () => {
    expect(resolveActiveClubId(clubs, 'removido')).toBe('a');
    expect(resolveActiveClubId(clubs, undefined)).toBe('a');
  });

  it('retorna null quando o usuário não tem clube', () => {
    expect(resolveActiveClubId([], 'a')).toBeNull();
  });
});
