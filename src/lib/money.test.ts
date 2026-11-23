import { formatCents, parseBrlToCents } from './money';

const nbsp = (text: string) => text.replaceAll(String.fromCharCode(160), ' ');

describe('formatCents', () => {
  it('formata centavos em BRL', () => {
    expect(nbsp(formatCents(123456))).toBe('R$ 1.234,56');
    expect(nbsp(formatCents(0))).toBe('R$ 0,00');
    expect(nbsp(formatCents(5))).toBe('R$ 0,05');
  });

  it('formata valores negativos', () => {
    expect(nbsp(formatCents(-4250))).toBe('-R$ 42,50');
  });

  it('rejeita valores não inteiros', () => {
    expect(() => formatCents(10.5)).toThrow(RangeError);
  });
});

describe('parseBrlToCents', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234,5', 123450],
    ['R$ 10', 1000],
    ['10', 1000],
    ['0,99', 99],
    [',5', 50],
    ['-5,00', -500],
    ['10.5', 1050],
    ['10.50', 1050],
    ['1.000', 100000],
    ['1.000.000,00', 100000000],
  ])('"%s" → %i', (input, expected) => {
    expect(parseBrlToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,234,56', '1,234', '12.34.56', '1.23,00', '--1'])(
    'rejeita "%s"',
    (input) => {
      expect(parseBrlToCents(input)).toBeNull();
    },
  );
});
