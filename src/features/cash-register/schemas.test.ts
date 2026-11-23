import { cashMovementSchema, closeCashSchema, openCashSchema } from './schemas';

describe('schemas do caixa', () => {
  it('aceita abertura zero ou vazia', () => {
    expect(openCashSchema.parse({ opening: '' }).opening).toBe(0);
    expect(openCashSchema.parse({ opening: '200,00' }).opening).toBe(20000);
  });

  it('exige valor positivo em sangria/suprimento', () => {
    expect(cashMovementSchema.safeParse({ amount: '0', note: '' }).success).toBe(false);
    expect(cashMovementSchema.parse({ amount: '50', note: ' Cofre ' })).toEqual({
      amount: 5000,
      note: 'Cofre',
    });
  });

  it('aceita contagem zero, recusa negativa', () => {
    expect(closeCashSchema.parse({ counted: '0', note: '' }).counted).toBe(0);
    expect(closeCashSchema.safeParse({ counted: '-1', note: '' }).success).toBe(false);
  });
});
