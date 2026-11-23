import { z } from 'zod';
import { parseBrlToCents } from '@/lib/money';
import { requiresPaymentMethod } from './domain/result';

/** Tipos que a tela de lançamento oferece (estorno tem fluxo próprio). */
export const ENTRY_FORM_KINDS = [
  'buy_in',
  'tournament_entry',
  'cash_out',
  'payment_in',
  'payout',
  'bar_charge',
] as const;

export type EntryFormKind = (typeof ENTRY_FORM_KINDS)[number];

export const entryFormSchema = z
  .object({
    kind: z.enum(ENTRY_FORM_KINDS),
    amount: z.string().transform((value, ctx) => {
      const cents = parseBrlToCents(value);
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Informe um valor maior que zero' });
        return z.NEVER;
      }
      return cents;
    }),
    paidUpfront: z.boolean(),
    /** id da forma de pagamento do clube (vazio = não informado). */
    paymentMethodId: z.string(),
    note: z
      .string()
      .trim()
      .max(500, 'Use no máximo 500 caracteres')
      .transform((value) => (value === '' ? null : value)),
  })
  .transform((data) => ({
    ...data,
    // "Pago na hora" só existe para compras de ficha/torneio.
    paidUpfront: (data.kind === 'buy_in' || data.kind === 'tournament_entry') && data.paidUpfront,
  }))
  .superRefine((data, ctx) => {
    if (requiresPaymentMethod(data.kind, data.paidUpfront) && data.paymentMethodId === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentMethodId'],
        message: 'Escolha a forma de pagamento',
      });
    }
  })
  .transform((data) => ({
    kind: data.kind,
    amountCents: data.amount,
    paidUpfront: data.paidUpfront,
    paymentMethodId:
      requiresPaymentMethod(data.kind, data.paidUpfront) && data.paymentMethodId !== ''
        ? data.paymentMethodId
        : null,
    note: data.note,
  }));

export type EntryFormInput = z.input<typeof entryFormSchema>;
export type EntryFormData = z.output<typeof entryFormSchema>;

export const reverseFormSchema = z.object({
  note: z.string().trim().min(3, 'Explique o motivo do estorno').max(500),
});
export type ReverseFormInput = z.input<typeof reverseFormSchema>;
