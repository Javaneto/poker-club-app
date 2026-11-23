import {
  entryEffect,
  legacyResult,
  requiresPaymentMethod,
  sessionStatus,
  sumEffects,
  type EntryForEffect,
} from './result';

const reais = (value: number) => Math.round(value * 100);

describe('entryEffect', () => {
  it.each([
    ['buy_in fiado', { kind: 'buy_in', amountCents: 10000, paidUpfront: false }, -10000],
    ['buy_in pago na hora', { kind: 'buy_in', amountCents: 10000, paidUpfront: true }, 0],
    ['torneio fiado', { kind: 'tournament_entry', amountCents: 5000, paidUpfront: false }, -5000],
    ['torneio pago', { kind: 'tournament_entry', amountCents: 5000, paidUpfront: true }, 0],
    ['saída', { kind: 'cash_out', amountCents: 25000, paidUpfront: false }, 25000],
    ['pagamento', { kind: 'payment_in', amountCents: 3000, paidUpfront: false }, 3000],
    ['pagamento ao jogador', { kind: 'payout', amountCents: 8000, paidUpfront: false }, -8000],
    ['bar fiado', { kind: 'bar_charge', amountCents: 1500, paidUpfront: false }, -1500],
  ] as [string, EntryForEffect, number][])('%s', (_label, entry, expected) => {
    expect(entryEffect(entry)).toBe(expected);
  });

  it('estorno inverte o efeito do original', () => {
    expect(
      entryEffect({
        kind: 'reversal',
        amountCents: 10000,
        paidUpfront: false,
        reversedEffectCents: -10000,
      }),
    ).toBe(10000);
    expect(
      entryEffect({
        kind: 'reversal',
        amountCents: 10000,
        paidUpfront: false,
        reversedEffectCents: 0,
      }),
    ).toBe(0);
  });

  it('rejeita valor negativo ou fracionado', () => {
    expect(() => entryEffect({ kind: 'cash_out', amountCents: -1, paidUpfront: false })).toThrow();
    expect(() =>
      entryEffect({ kind: 'cash_out', amountCents: 10.5, paidUpfront: false }),
    ).toThrow();
  });
});

describe('resultado da sessão', () => {
  // Noite típica de cash: compra 3x R$ 100 (uma paga na hora), sai com R$ 180, paga R$ 50.
  const night: EntryForEffect[] = [
    { kind: 'buy_in', amountCents: reais(100), paidUpfront: true },
    { kind: 'buy_in', amountCents: reais(100), paidUpfront: false },
    { kind: 'buy_in', amountCents: reais(100), paidUpfront: false },
    { kind: 'cash_out', amountCents: reais(180), paidUpfront: false },
    { kind: 'payment_in', amountCents: reais(50), paidUpfront: false },
  ];

  it('soma os efeitos', () => {
    expect(sumEffects(night)).toBe(reais(30));
  });

  it('reproduz a fórmula do legado', () => {
    const legacy = legacyResult({
      cashOutsCents: reais(180),
      unpaidEntriesCents: reais(200),
      paymentsCents: reais(50),
    });
    expect(sumEffects(night)).toBe(legacy);
  });

  it('crédito de uma noite abate a dívida de outra (saldo corrido)', () => {
    const owes: EntryForEffect[] = [
      { kind: 'buy_in', amountCents: reais(200), paidUpfront: false },
    ];
    const wins: EntryForEffect[] = [
      { kind: 'buy_in', amountCents: reais(100), paidUpfront: true },
      { kind: 'cash_out', amountCents: reais(250), paidUpfront: false },
    ];
    expect(sumEffects([...owes, ...wins])).toBe(reais(50));
  });

  it.each([
    [-1, 'pending'],
    [0, 'settled'],
    [1, 'credit'],
  ] as const)('resultado %i → %s', (result, status) => {
    expect(sessionStatus(result)).toBe(status);
  });
});

describe('requiresPaymentMethod', () => {
  it('exige forma de pagamento só quando há dinheiro de verdade', () => {
    expect(requiresPaymentMethod('payment_in', false)).toBe(true);
    expect(requiresPaymentMethod('payout', false)).toBe(true);
    expect(requiresPaymentMethod('buy_in', true)).toBe(true);
    expect(requiresPaymentMethod('buy_in', false)).toBe(false);
    expect(requiresPaymentMethod('cash_out', false)).toBe(false);
  });
});
