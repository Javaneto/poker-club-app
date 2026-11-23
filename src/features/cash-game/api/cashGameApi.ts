import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { isEntryKind, type EntryKind } from '@/features/ledger/domain/result';
import { isTableEntryKind, type TableEntryKind } from '../domain/chips';

export interface CashTable {
  id: string;
  name: string;
  smallBlindCents: number | null;
  bigBlindCents: number | null;
  maxPlayers: number | null;
  note: string | null;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt: string | null;
  closingNote: string | null;
}

export interface CashTableListItem extends CashTable {
  seatedCount: number;
}

export interface TableSummary {
  purchasesCents: number;
  returnsCents: number;
  rakeCents: number;
  tipsCents: number;
  expensesCents: number;
  chipsCents: number;
  seatedCount: number;
}

export interface TablePlayer {
  playerId: string;
  fullName: string;
  nickname: string | null;
  /** Assento atual (null = já levantou). */
  seatId: string | null;
  seatedAt: string | null;
  completedSeconds: number;
  buyInCents: number;
  cashOutCents: number;
}

/** Linha da atividade da mesa: compra/devolução (ledger) ou rake/capilé/despesa (mesa). */
export type TableActivity =
  | {
      source: 'ledger';
      id: string;
      kind: EntryKind;
      reversedKind: EntryKind | null;
      amountCents: number;
      paidUpfront: boolean;
      methodName: string | null;
      playerName: string;
      isReversed: boolean;
      note: string | null;
      createdAt: string;
    }
  | {
      source: 'table';
      id: string;
      kind: TableEntryKind;
      isReversal: boolean;
      amountCents: number;
      isReversed: boolean;
      note: string | null;
      createdAt: string;
    };

export interface Paged<T> {
  items: T[];
  total: number;
}

export const TABLE_PAGE_SIZE = 20;

const TABLE_COLUMNS =
  'id, name, small_blind_cents, big_blind_cents, max_players, note, status, opened_at, closed_at, closing_note' as const;

interface TableRow {
  id: string;
  name: string;
  small_blind_cents: number | null;
  big_blind_cents: number | null;
  max_players: number | null;
  note: string | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  closing_note: string | null;
}

function toTable(row: TableRow): CashTable {
  return {
    id: row.id,
    name: row.name,
    smallBlindCents: row.small_blind_cents,
    bigBlindCents: row.big_blind_cents,
    maxPlayers: row.max_players,
    note: row.note,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    closingNote: row.closing_note,
  };
}

// ----------------------------------------------------------------------------- leitura

export async function fetchOpenTables(clubId: string): Promise<CashTableListItem[]> {
  const { data, error } = await supabase
    .from('cash_tables')
    .select(`${TABLE_COLUMNS}, seats:cash_table_seats(count)`)
    .eq('club_id', clubId)
    .eq('status', 'open')
    .is('seats.left_at', null)
    .order('opened_at');
  if (error) throw error;
  return data.map((row) => ({ ...toTable(row), seatedCount: row.seats[0]?.count ?? 0 }));
}

export async function fetchClosedTables(clubId: string, page: number): Promise<Paged<CashTable>> {
  const from = (Math.max(1, page) - 1) * TABLE_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('cash_tables')
    .select(TABLE_COLUMNS, { count: 'exact' })
    .eq('club_id', clubId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .range(from, from + TABLE_PAGE_SIZE - 1);
  if (error) throw error;
  return { items: data.map(toTable), total: count ?? 0 };
}

export async function fetchTable(tableId: string): Promise<CashTable | null> {
  const { data, error } = await supabase
    .from('cash_tables')
    .select(TABLE_COLUMNS)
    .eq('id', tableId)
    .maybeSingle();
  if (error) throw error;
  return data ? toTable(data) : null;
}

export async function fetchTableSummary(tableId: string): Promise<TableSummary> {
  const { data, error } = await supabase.rpc('cash_table_summary', { target_table_id: tableId });
  if (error) throw error;
  const row = data[0];
  if (!row) throw new Error('Mesa não encontrada');
  return {
    purchasesCents: row.purchases_cents,
    returnsCents: row.returns_cents,
    rakeCents: row.rake_cents,
    tipsCents: row.tips_cents,
    expensesCents: row.expenses_cents,
    chipsCents: row.chips_cents,
    seatedCount: row.seated_count,
  };
}

// Os tipos gerados não marcam colunas anuláveis de funções; valida com Zod.
const playerRowSchema = z.object({
  player_id: z.string(),
  full_name: z.string(),
  nickname: z.string().nullable(),
  seat_id: z.string().nullable(),
  seated_at: z.string().nullable(),
  completed_seconds: z.coerce.number(),
  buy_in_cents: z.coerce.number(),
  cash_out_cents: z.coerce.number(),
});

export async function fetchTablePlayers(tableId: string): Promise<TablePlayer[]> {
  const { data, error } = await supabase.rpc('cash_table_players', { target_table_id: tableId });
  if (error) throw error;
  return z
    .array(playerRowSchema)
    .parse(data)
    .map((row) => ({
      playerId: row.player_id,
      fullName: row.full_name,
      nickname: row.nickname,
      seatId: row.seat_id,
      seatedAt: row.seated_at,
      completedSeconds: row.completed_seconds,
      buyInCents: row.buy_in_cents,
      cashOutCents: row.cash_out_cents,
    }));
}

export async function fetchTableActivity(
  tableId: string,
  page: number,
): Promise<Paged<TableActivity>> {
  const from = (Math.max(1, page) - 1) * TABLE_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('cash_table_activity')
    .select(
      'id, source, kind, reversed_kind, amount_cents, paid_upfront, method_name, player_name, reverses_id, is_reversed, note, created_at',
      { count: 'exact' },
    )
    .eq('table_id', tableId)
    .order('created_at', { ascending: false })
    .range(from, from + TABLE_PAGE_SIZE - 1);
  if (error) throw error;

  const items = data.flatMap((row): TableActivity[] => {
    if (!row.id || !row.created_at) return [];
    const base = {
      id: row.id,
      amountCents: row.amount_cents ?? 0,
      isReversed: row.is_reversed ?? false,
      note: row.note,
      createdAt: row.created_at,
    };
    if (row.source === 'ledger' && isEntryKind(row.kind)) {
      return [
        {
          ...base,
          source: 'ledger',
          kind: row.kind,
          reversedKind: isEntryKind(row.reversed_kind) ? row.reversed_kind : null,
          paidUpfront: row.paid_upfront ?? false,
          methodName: row.method_name,
          playerName: row.player_name ?? '—',
        },
      ];
    }
    if (row.source === 'table' && isTableEntryKind(row.kind)) {
      return [{ ...base, source: 'table', kind: row.kind, isReversal: row.reverses_id !== null }];
    }
    return [];
  });
  return { items, total: count ?? 0 };
}

// ----------------------------------------------------------------------------- escrita (RPCs)

export interface OpenTableInput {
  name: string;
  smallBlindCents: number | null;
  bigBlindCents: number | null;
  maxPlayers: number | null;
  note: string | null;
}

export async function openTable(clubId: string, input: OpenTableInput): Promise<string> {
  const { data, error } = await supabase.rpc('open_cash_table', {
    target_club_id: clubId,
    table_name: input.name,
    small_blind_cents: input.smallBlindCents ?? undefined,
    big_blind_cents: input.bigBlindCents ?? undefined,
    max_players: input.maxPlayers ?? undefined,
    table_note: input.note ?? undefined,
  });
  if (error) throw error;
  return data;
}

export interface PurchaseInput {
  amountCents: number;
  paidUpfront: boolean;
  paymentMethodId: string | null;
  note: string | null;
}

/** Senta o jogador e, se houver valor, lança a primeira compra (uma transação). */
export async function seatPlayer(
  tableId: string,
  playerId: string,
  purchase: PurchaseInput | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('seat_player', {
    target_table_id: tableId,
    target_player_id: playerId,
    buy_in_cents: purchase?.amountCents,
    paid_upfront: purchase?.paidUpfront ?? false,
    method_id: purchase?.paymentMethodId ?? undefined,
    entry_note: purchase?.note ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function tableBuyIn(
  tableId: string,
  playerId: string,
  purchase: PurchaseInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('table_buy_in', {
    target_table_id: tableId,
    target_player_id: playerId,
    amount_cents: purchase.amountCents,
    paid_upfront: purchase.paidUpfront,
    method_id: purchase.paymentMethodId ?? undefined,
    entry_note: purchase.note ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function tableCashOut(
  tableId: string,
  playerId: string,
  input: { amountCents: number; leaveTable: boolean; note: string | null },
): Promise<string> {
  const { data, error } = await supabase.rpc('table_cash_out', {
    target_table_id: tableId,
    target_player_id: playerId,
    amount_cents: input.amountCents,
    leave_table: input.leaveTable,
    entry_note: input.note ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function unseatPlayer(seatId: string): Promise<void> {
  const { error } = await supabase.rpc('unseat_player', { target_seat_id: seatId });
  if (error) throw error;
}

export async function recordTableEntry(
  tableId: string,
  input: { kind: TableEntryKind; amountCents: number; note: string | null },
): Promise<string> {
  const { data, error } = await supabase.rpc('record_table_entry', {
    target_table_id: tableId,
    entry_kind: input.kind,
    amount_cents: input.amountCents,
    entry_note: input.note ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** Estorno de uma linha da atividade: rake/capilé/despesa pela mesa; compra/devolução pelo ledger. */
export async function reverseActivity(
  item: Pick<TableActivity, 'source' | 'id'>,
  note: string,
): Promise<void> {
  const { error } =
    item.source === 'table'
      ? await supabase.rpc('reverse_table_entry', { target_entry_id: item.id, entry_note: note })
      : await supabase.rpc('reverse_entry', { target_entry_id: item.id, entry_note: note });
  if (error) throw error;
}

export async function closeTable(tableId: string, note: string | null): Promise<void> {
  const { error } = await supabase.rpc('close_cash_table', {
    target_table_id: tableId,
    closing_note: note ?? undefined,
  });
  if (error) throw error;
}

export function subscribeToCashGame(clubId: string, onChange: () => void): () => void {
  const filter = `club_id=eq.${clubId}`;
  const channel = supabase
    .channel(`cash-game:${clubId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_tables', filter },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_table_seats', filter },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'cash_table_entries', filter },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ledger_entries', filter },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
