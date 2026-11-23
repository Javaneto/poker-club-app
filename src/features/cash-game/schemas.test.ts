import { describe, expect, it } from 'vitest';
import { cashOutSchema, openTableSchema, purchaseSchema, tableEntrySchema } from './schemas';

describe('openTableSchema', () => {
  it('converte blinds e limite', () => {
    expect(
      openTableSchema.parse({
        name: ' Mesa 1 ',
        smallBlind: '1',
        bigBlind: '2',
        maxPlayers: '9',
        note: '',
      }),
    ).toEqual({
      name: 'Mesa 1',
      smallBlindCents: 100,
      bigBlindCents: 200,
      maxPlayers: 9,
      note: null,
    });
  });

  it('limite vazio = sem limite; fora de 2–12 é inválido', () => {
    const base = { name: 'Mesa', smallBlind: '1', bigBlind: '2', note: '' };
    expect(openTableSchema.parse({ ...base, maxPlayers: '' }).maxPlayers).toBeNull();
    expect(openTableSchema.safeParse({ ...base, maxPlayers: '13' }).success).toBe(false);
  });

  it('small blind maior que big blind é inválido', () => {
    const result = openTableSchema.safeParse({
      name: 'Mesa',
      smallBlind: '5',
      bigBlind: '2',
      maxPlayers: '',
      note: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('purchaseSchema', () => {
  it('ao sentar, valor vazio = sem compra', () => {
    expect(
      purchaseSchema(true).parse({ amount: '', paidUpfront: false, paymentMethodId: '', note: '' }),
    ).toBeNull();
  });

  it('compra exige valor e, se paga na hora, a forma', () => {
    expect(
      purchaseSchema(false).safeParse({
        amount: '',
        paidUpfront: false,
        paymentMethodId: '',
        note: '',
      }).success,
    ).toBe(false);
    expect(
      purchaseSchema(false).safeParse({
        amount: '100',
        paidUpfront: true,
        paymentMethodId: '',
        note: '',
      }).success,
    ).toBe(false);
  });

  it('fiado descarta a forma escolhida', () => {
    expect(
      purchaseSchema(false).parse({
        amount: '100,50',
        paidUpfront: false,
        paymentMethodId: 'pix',
        note: '',
      }),
    ).toEqual({ amountCents: 10050, paidUpfront: false, paymentMethodId: null, note: null });
  });
});

describe('cashOutSchema / tableEntrySchema', () => {
  it('devolução e rake exigem valor positivo', () => {
    expect(cashOutSchema.safeParse({ amount: '0', leaveTable: true, note: '' }).success).toBe(
      false,
    );
    expect(tableEntrySchema.parse({ kind: 'tip', amount: '5', note: 'Dealer' })).toEqual({
      kind: 'tip',
      amount: 500,
      note: 'Dealer',
    });
  });
});
