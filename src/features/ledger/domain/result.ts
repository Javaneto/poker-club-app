/**
 * Conta do jogador: efeito de cada lançamento no resultado.
 * Positivo = clube deve ao jogador; negativo = jogador deve ao clube.
 * Espelha a função `ledger_effect` do banco — os dois precisam concordar (ver testes).
 */

export const ENTRY_KINDS = [
  'buy_in',
  'tournament_entry',
  'cash_out',
  'payment_in',
  'payout',
  'bar_charge',
  'reversal',
] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  buy_in: 'Entrada (cash)',
  tournament_entry: 'Torneio',
  cash_out: 'Saída (cash)',
  payment_in: 'Pagamento',
  payout: 'Pagamento ao jogador',
  bar_charge: 'Bar',
  reversal: 'Estorno',
};

export const PAYMENT_METHODS = ['cash', 'pix', 'debit_card', 'credit_card', 'other'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  debit_card: 'Cartão de débito',
  credit_card: 'Cartão de crédito',
  other: 'Outro',
};

export interface EntryForEffect {
  kind: EntryKind;
  amountCents: number;
  paidUpfront: boolean;
  /** Para estornos: o efeito do lançamento original. */
  reversedEffectCents?: number;
}

export function isEntryKind(value: unknown): value is EntryKind {
  return typeof value === 'string' && (ENTRY_KINDS as readonly string[]).includes(value);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}

/** Efeito de um lançamento no resultado, em centavos. */
export function entryEffect(entry: EntryForEffect): number {
  if (!Number.isSafeInteger(entry.amountCents) || entry.amountCents < 0) {
    throw new RangeError(`Valor inválido: ${entry.amountCents}`);
  }
  switch (entry.kind) {
    case 'buy_in':
    case 'tournament_entry':
      // Pago na hora não mexe no resultado (só registra); fiado é dívida.
      return entry.paidUpfront ? 0 : -entry.amountCents;
    case 'cash_out':
    case 'payment_in':
      return entry.amountCents;
    case 'payout':
    case 'bar_charge':
      return -entry.amountCents;
    case 'reversal':
      if (entry.reversedEffectCents === undefined) {
        throw new Error('Estorno sem o efeito do lançamento original');
      }
      return 0 - entry.reversedEffectCents; // evita -0 quando o original não teve efeito
  }
}

/** Resultado = soma dos efeitos (sessão ou saldo geral). */
export function sumEffects(entries: readonly EntryForEffect[]): number {
  return entries.reduce((total, entry) => total + entryEffect(entry), 0);
}

export type SessionStatus = 'pending' | 'settled' | 'credit';

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  pending: 'Pendente',
  settled: 'Realizado',
  credit: 'Crédito',
};

/** Status de uma sessão pelo resultado: < 0 pendente (fiado), = 0 realizado, > 0 crédito. */
export function sessionStatus(resultCents: number): SessionStatus {
  if (resultCents < 0) return 'pending';
  if (resultCents > 0) return 'credit';
  return 'settled';
}

/** Fórmula do legado, para conferência: Saídas − (Entradas não pagas − Pagamentos). */
export function legacyResult(totals: {
  cashOutsCents: number;
  unpaidEntriesCents: number;
  paymentsCents: number;
}): number {
  return totals.cashOutsCents - (totals.unpaidEntriesCents - totals.paymentsCents);
}

/** Exige forma de pagamento quando entra/sai dinheiro de verdade. */
export function requiresPaymentMethod(kind: EntryKind, paidUpfront: boolean): boolean {
  if (kind === 'payment_in' || kind === 'payout') return true;
  if (kind === 'buy_in' || kind === 'tournament_entry') return paidUpfront;
  return false;
}
