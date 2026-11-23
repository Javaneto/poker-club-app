import { z } from 'zod';
import { parseBrlToCents } from '@/lib/money';
import { PAYMENT_METHODS } from '@/features/ledger/domain/result';

/** Valor em reais digitado → centavos. `allowZero` para abertura e contagem. */
export const moneyField = (allowZero: boolean) =>
  z.string().transform((value, ctx) => {
    const cents = parseBrlToCents(value === '' && allowZero ? '0' : value);
    if (cents === null || cents < 0 || (!allowZero && cents === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: allowZero ? 'Informe um valor (pode ser zero)' : 'Informe um valor maior que zero',
      });
      return z.NEVER;
    }
    return cents;
  });

const optionalNote = z
  .string()
  .trim()
  .max(500, 'Use no máximo 500 caracteres')
  .transform((value) => (value === '' ? null : value));

export const openCashSchema = z.object({ opening: moneyField(true) });
export type OpenCashInput = z.input<typeof openCashSchema>;
export type OpenCashData = z.output<typeof openCashSchema>;

export const cashMovementSchema = z.object({ amount: moneyField(false), note: optionalNote });
export type CashMovementInput = z.input<typeof cashMovementSchema>;
export type CashMovementData = z.output<typeof cashMovementSchema>;

export const closeCashSchema = z.object({ counted: moneyField(true), note: optionalNote });
export type CloseCashInput = z.input<typeof closeCashSchema>;
export type CloseCashData = z.output<typeof closeCashSchema>;

export const paymentMethodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Use pelo menos 2 caracteres')
    .max(40, 'Use no máximo 40 caracteres'),
  kind: z.enum(PAYMENT_METHODS),
});
export type PaymentMethodInput = z.input<typeof paymentMethodSchema>;
