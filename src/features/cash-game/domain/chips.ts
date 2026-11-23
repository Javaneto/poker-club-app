/**
 * Cash game: conferência de fichas da mesa e regras de encerramento.
 * Espelha `cash_table_summary` e `close_cash_table` do banco.
 * Fichas na mesa = compras − devoluções − rake − capilé. Despesas não entram.
 */

export const TABLE_ENTRY_KINDS = ['rake', 'tip', 'expense'] as const;

export type TableEntryKind = (typeof TABLE_ENTRY_KINDS)[number];

export const TABLE_ENTRY_KIND_LABELS: Record<TableEntryKind, string> = {
  rake: 'Rake',
  tip: 'Capilé',
  expense: 'Despesa',
};

export function isTableEntryKind(value: unknown): value is TableEntryKind {
  return typeof value === 'string' && (TABLE_ENTRY_KINDS as readonly string[]).includes(value);
}

/** Rake e capilé saem das fichas da mesa; despesa é só registro. */
export function removesChips(kind: TableEntryKind): boolean {
  return kind !== 'expense';
}

export interface ChipTotals {
  purchasesCents: number;
  returnsCents: number;
  rakeCents: number;
  tipsCents: number;
}

export function chipsOnTable(totals: ChipTotals): number {
  return totals.purchasesCents - totals.returnsCents - totals.rakeCents - totals.tipsCents;
}

export interface TableEntryForTotals {
  kind: TableEntryKind;
  amountCents: number;
  /** Estorno: mesmo tipo e valor do original, efeito inverso. */
  isReversal: boolean;
}

/** Soma rake, capilé e despesas considerando estornos. */
export function sumTableEntries(
  entries: readonly TableEntryForTotals[],
): Record<TableEntryKind, number> {
  const totals: Record<TableEntryKind, number> = { rake: 0, tip: 0, expense: 0 };
  for (const entry of entries) {
    totals[entry.kind] += entry.isReversal ? -entry.amountCents : entry.amountCents;
  }
  return totals;
}

/** Devolução, rake e capilé não podem passar das fichas na mesa. */
export function exceedsChips(amountCents: number, chipsCents: number): boolean {
  return amountCents > chipsCents;
}

export type CloseBlocker = 'players_seated' | 'chips_remaining' | 'chips_negative';

export const CLOSE_BLOCKER_MESSAGES: Record<CloseBlocker, string> = {
  players_seated: 'Ainda há jogadores sentados. Levante todos antes de encerrar.',
  chips_remaining: 'Ainda há fichas na mesa. Lance as devoluções, o rake ou o capilé que faltam.',
  chips_negative: 'Saiu mais ficha do que entrou. Confira e estorne o lançamento errado.',
};

/** Motivo que impede encerrar a mesa, ou null se pode encerrar. */
export function closeBlocker(input: {
  chipsCents: number;
  seatedCount: number;
}): CloseBlocker | null {
  if (input.seatedCount > 0) return 'players_seated';
  if (input.chipsCents > 0) return 'chips_remaining';
  if (input.chipsCents < 0) return 'chips_negative';
  return null;
}

/** Resultado do jogador na mesa (devoluções − compras): positivo = ganhou fichas. */
export function playerTableResult(input: { buyInCents: number; cashOutCents: number }): number {
  return input.cashOutCents - input.buyInCents;
}

/**
 * Blinds para exibição: "R$ 1/2"; só um informado: "SB R$ 1" ou "BB R$ 2".
 * Sem blinds: null (a tela omite).
 */
export function formatBlinds(
  smallBlindCents: number | null,
  bigBlindCents: number | null,
  format: (cents: number) => string,
): string | null {
  const short = (cents: number) =>
    format(cents)
      .replace(/^R\$\s?/, '')
      .replace(/,00$/, '');
  if (smallBlindCents !== null && bigBlindCents !== null) {
    return `R$ ${short(smallBlindCents)}/${short(bigBlindCents)}`;
  }
  if (bigBlindCents !== null) return `BB R$ ${short(bigBlindCents)}`;
  if (smallBlindCents !== null) return `SB R$ ${short(smallBlindCents)}`;
  return null;
}
