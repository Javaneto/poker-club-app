/**
 * Caixa do Dia: fluxo de dinheiro dos lançamentos e conferência do fechamento.
 * Espelha `ledger_cash_flow` e `cash_session_summary` do banco.
 * Fechamento confere só o dinheiro físico (PIX/cartões são informativos).
 */

import type { EntryKind, PaymentMethod } from '@/features/ledger/domain/result';

export interface FlowEntry {
  kind: EntryKind;
  amountCents: number;
  paidUpfront: boolean;
  /** Para estornos: o fluxo do lançamento original. */
  reversedFlowCents?: number;
}

/** + dinheiro entra no clube; − sai; 0 = não envolve dinheiro (fiado, saída de fichas, bar fiado). */
export function cashFlow(entry: FlowEntry): number {
  switch (entry.kind) {
    case 'buy_in':
    case 'tournament_entry':
      return entry.paidUpfront ? entry.amountCents : 0;
    case 'payment_in':
      return entry.amountCents;
    case 'payout':
      return -entry.amountCents;
    case 'reversal':
      return 0 - (entry.reversedFlowCents ?? 0);
    case 'cash_out':
    case 'bar_charge':
      return 0;
  }
}

export interface CashTotals {
  openingCents: number;
  /** Entradas em dinheiro físico. */
  cashInCents: number;
  /** Saídas em dinheiro físico (pagamentos ao jogador, estornos de recebimentos). */
  cashOutCents: number;
  depositsCents: number;
  withdrawalsCents: number;
}

export function expectedCash(totals: CashTotals): number {
  return (
    totals.openingCents +
    totals.cashInCents -
    totals.cashOutCents +
    totals.depositsCents -
    totals.withdrawalsCents
  );
}

/** Diferença do fechamento: positivo = sobrou; negativo = faltou. */
export function closingDifference(countedCents: number, expectedCents: number): number {
  return countedCents - expectedCents;
}

export type DifferenceStatus = 'exact' | 'over' | 'short';

export function differenceStatus(differenceCents: number): DifferenceStatus {
  if (differenceCents > 0) return 'over';
  if (differenceCents < 0) return 'short';
  return 'exact';
}

export const DIFFERENCE_LABELS: Record<DifferenceStatus, string> = {
  exact: 'Caixa batendo',
  over: 'Sobra',
  short: 'Falta',
};

/** Soma entradas e saídas em dinheiro físico a partir dos lançamentos (para conferência local). */
export function cashTotalsFromEntries(
  entries: readonly { paymentKind: PaymentMethod | null; cashFlowCents: number }[],
): Pick<CashTotals, 'cashInCents' | 'cashOutCents'> {
  return entries.reduce(
    (totals, entry) => {
      if (entry.paymentKind !== 'cash') return totals;
      if (entry.cashFlowCents > 0) totals.cashInCents += entry.cashFlowCents;
      else totals.cashOutCents -= entry.cashFlowCents;
      return totals;
    },
    { cashInCents: 0, cashOutCents: 0 },
  );
}
