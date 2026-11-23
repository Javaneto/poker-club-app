import { z } from 'zod';
import { moneyField } from '@/features/cash-register/schemas';
import { parseBrlToCents } from '@/lib/money';
import { TABLE_ENTRY_KINDS } from './domain/chips';

/** Valor opcional em reais: vazio = não informado; se informado, maior que zero. */
const optionalMoney = z.string().transform((value, ctx) => {
  if (value.trim() === '') return null;
  const cents = parseBrlToCents(value);
  if (cents === null || cents <= 0) {
    ctx.addIssue({ code: 'custom', message: 'Deixe vazio ou informe um valor maior que zero' });
    return z.NEVER;
  }
  return cents;
});

const optionalNote = z
  .string()
  .trim()
  .max(500, 'Use no máximo 500 caracteres')
  .transform((value) => (value === '' ? null : value));

export const openTableSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Use pelo menos 2 caracteres')
      .max(60, 'Use no máximo 60 caracteres'),
    smallBlind: optionalMoney,
    bigBlind: optionalMoney,
    maxPlayers: z
      .string()
      .trim()
      .transform((value, ctx) => {
        if (value === '') return null;
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 2 || parsed > 12) {
          ctx.addIssue({ code: 'custom', message: 'Use um número entre 2 e 12' });
          return z.NEVER;
        }
        return parsed;
      }),
    note: optionalNote,
  })
  .refine(
    (data) =>
      data.smallBlind === null || data.bigBlind === null || data.smallBlind <= data.bigBlind,
    {
      path: ['smallBlind'],
      message: 'O small blind não pode ser maior que o big blind',
    },
  )
  .transform((data) => ({
    name: data.name,
    smallBlindCents: data.smallBlind,
    bigBlindCents: data.bigBlind,
    maxPlayers: data.maxPlayers,
    note: data.note,
  }));
export type OpenTableFormInput = z.input<typeof openTableSchema>;
export type OpenTableFormData = z.output<typeof openTableSchema>;

/**
 * Compra de fichas na mesa. `optional`: ao sentar, valor vazio = sentar sem comprar.
 * Forma de pagamento só quando "pago na hora".
 */
export const purchaseSchema = (optional: boolean) =>
  z
    .object({
      amount: z.string().transform((value, ctx) => {
        if (optional && value.trim() === '') return null;
        const cents = parseBrlToCents(value);
        if (cents === null || cents <= 0) {
          ctx.addIssue({ code: 'custom', message: 'Informe um valor maior que zero' });
          return z.NEVER;
        }
        return cents;
      }),
      paidUpfront: z.boolean(),
      paymentMethodId: z.string(),
      note: optionalNote,
    })
    .superRefine((data, ctx) => {
      if (data.amount !== null && data.paidUpfront && data.paymentMethodId === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['paymentMethodId'],
          message: 'Escolha a forma de pagamento',
        });
      }
    })
    .transform((data) =>
      data.amount === null
        ? null
        : {
            amountCents: data.amount,
            paidUpfront: data.paidUpfront,
            paymentMethodId: data.paidUpfront ? data.paymentMethodId : null,
            note: data.note,
          },
    );
export type PurchaseFormInput = z.input<ReturnType<typeof purchaseSchema>>;
export type PurchaseFormData = z.output<ReturnType<typeof purchaseSchema>>;

export const cashOutSchema = z.object({
  amount: moneyField(false),
  leaveTable: z.boolean(),
  note: optionalNote,
});
export type CashOutFormInput = z.input<typeof cashOutSchema>;
export type CashOutFormData = z.output<typeof cashOutSchema>;

export const tableEntrySchema = z.object({
  kind: z.enum(TABLE_ENTRY_KINDS),
  amount: moneyField(false),
  note: optionalNote,
});
export type TableEntryFormInput = z.input<typeof tableEntrySchema>;
export type TableEntryFormData = z.output<typeof tableEntrySchema>;

export const closeTableSchema = z.object({ note: optionalNote });
export type CloseTableFormInput = z.input<typeof closeTableSchema>;
export type CloseTableFormData = z.output<typeof closeTableSchema>;
