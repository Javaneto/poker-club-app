import type { TableActivity } from '../api/cashGameApi';
import { TABLE_ENTRY_KIND_LABELS } from '../domain/chips';

const LEDGER_LABELS = { buy_in: 'Compra', cash_out: 'Devolução' } as const;

function ledgerKindLabel(kind: string): string {
  return kind === 'buy_in' || kind === 'cash_out' ? LEDGER_LABELS[kind] : 'Lançamento';
}

/** Texto curto de uma linha da atividade da mesa. */
export function activityLabel(item: TableActivity): string {
  if (item.source === 'table') {
    const label = TABLE_ENTRY_KIND_LABELS[item.kind];
    return item.isReversal ? `Estorno de ${label.toLowerCase()}` : label;
  }
  if (item.kind === 'reversal') {
    return `Estorno de ${ledgerKindLabel(item.reversedKind ?? '').toLowerCase()}`;
  }
  return ledgerKindLabel(item.kind);
}

/** Linha que já é estorno (não pode ser estornada). */
export function isReversalActivity(item: TableActivity): boolean {
  return item.source === 'table' ? item.isReversal : item.kind === 'reversal';
}
