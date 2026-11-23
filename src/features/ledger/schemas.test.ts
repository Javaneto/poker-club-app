import { entryFormSchema } from './schemas';

const base = {
  kind: 'buy_in',
  amount: '100',
  paidUpfront: false,
  paymentMethodId: '',
  note: '',
} as const;

describe('entryFormSchema', () => {
  it('converte o valor para centavos e limpa forma de pagamento de compra fiada', () => {
    expect(
      entryFormSchema.parse({ ...base, amount: '1.250,50', paymentMethodId: 'pix-id' }),
    ).toEqual({
      kind: 'buy_in',
      amountCents: 125050,
      paidUpfront: false,
      paymentMethodId: null,
      note: null,
    });
  });

  it('exige forma de pagamento em compra paga na hora e em pagamentos', () => {
    expect(entryFormSchema.safeParse({ ...base, paidUpfront: true }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...base, kind: 'payment_in' }).success).toBe(false);
    expect(
      entryFormSchema.parse({ ...base, kind: 'payment_in', paymentMethodId: 'cash-id' })
        .paymentMethodId,
    ).toBe('cash-id');
  });

  it('ignora "pago na hora" em saída e bar', () => {
    const data = entryFormSchema.parse({ ...base, kind: 'cash_out', paidUpfront: true });
    expect(data.paidUpfront).toBe(false);
    expect(data.paymentMethodId).toBeNull();
  });

  it('rejeita valor zero ou inválido', () => {
    expect(entryFormSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...base, amount: 'abc' }).success).toBe(false);
  });
});
