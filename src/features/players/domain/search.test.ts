import { escapeLike, pageCount, pageRange, toSearchTerm } from './search';

describe('toSearchTerm', () => {
  it.each([
    ['  José ', 'jose'],
    ['(11) 98765', '1198765'],
    ['529.982.247-25', '52998224725'],
    ['Zé 2', 'ze 2'],
    ['   ', null],
    ['()', null],
  ])('"%s" → %s', (input, expected) => {
    expect(toSearchTerm(input)).toBe(expected);
  });
});

describe('escapeLike', () => {
  it('escapa curingas', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});

describe('paginação', () => {
  it('calcula o intervalo da página', () => {
    expect(pageRange(1, 25)).toEqual([0, 24]);
    expect(pageRange(3, 25)).toEqual([50, 74]);
    expect(pageRange(0, 25)).toEqual([0, 24]);
  });

  it('calcula o total de páginas (mínimo 1)', () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
  });
});
