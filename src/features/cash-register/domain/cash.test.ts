import {
  cashFlow,
  cashTotalsFromEntries,
  closingDifference,
  differenceStatus,
  expectedCash,
  type FlowEntry,
} from './cash';

describe('cashFlow', () => {
  it.each([
    ['compra paga', { kind: 'buy_in', amountCents: 10000, paidUpfront: true }, 10000],
    ['compra fiada', { kind: 'buy_in', amountCents: 10000, paidUpfront: false }, 0],
    ['torneio pago', { kind: 'tournament_entry', amountCents: 5000, paidUpfront: true }, 5000],
    ['pagamento', { kind: 'payment_in', amountCents: 3000, paidUpfront: false }, 3000],
    ['pagamento ao jogador', { kind: 'payout', amountCents: 4000, paidUpfront: false }, -4000],
    ['saída de fichas', { kind: 'cash_out', amountCents: 9000, paidUpfront: false }, 0],
    ['bar fiado', { kind: 'bar_charge', amountCents: 1500, paidUpfront: false }, 0],
    [
      'estorno de pagamento',
      { kind: 'reversal', amountCents: 3000, paidUpfront: false, reversedFlowCents: 3000 },
      -3000,
    ],
    [
      'estorno de compra fiada',
      { kind: 'reversal', amountCents: 3000, paidUpfront: false, reversedFlowCents: 0 },
      0,
    ],
  ] as [string, FlowEntry, number][])('%s', (_label, entry, expected) => {
    expect(cashFlow(entry)).toBe(expected);
  });
});

describe('conferência do caixa', () => {
  // Mesmo cenário do teste de banco: abertura 200, dinheiro +130 −40, suprimento 100, sangria 150.
  const totals = {
    openingCents: 20000,
    cashInCents: 13000,
    cashOutCents: 4000,
    depositsCents: 10000,
    withdrawalsCents: 15000,
  };

  it('calcula o esperado em dinheiro', () => {
    expect(expectedCash(totals)).toBe(24000);
  });

  it('calcula e classifica a diferença', () => {
    expect(closingDifference(23500, 24000)).toBe(-500);
    expect(differenceStatus(-500)).toBe('short');
    expect(differenceStatus(0)).toBe('exact');
    expect(differenceStatus(100)).toBe('over');
  });

  it('soma só o dinheiro físico', () => {
    expect(
      cashTotalsFromEntries([
        { paymentKind: 'cash', cashFlowCents: 10000 },
        { paymentKind: 'pix', cashFlowCents: 5000 },
        { paymentKind: 'cash', cashFlowCents: 3000 },
        { paymentKind: 'cash', cashFlowCents: -4000 },
        { paymentKind: null, cashFlowCents: 0 },
      ]),
    ).toEqual({ cashInCents: 13000, cashOutCents: 4000 });
  });
});
