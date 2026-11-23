import { supabase } from '@/lib/supabase';
import { isEntryKind, isPaymentMethod, type EntryKind, type PaymentMethod } from '../domain/result';
import type { EntryFormData } from '../schemas';

export interface LedgerEntry {
  id: string;
  playerId: string;
  sessionId: string | null;
  kind: EntryKind;
  amountCents: number;
  paidUpfront: boolean;
  paymentMethod: PaymentMethod | null;
  effectCents: number;
  reversesId: string | null;
  reversedById: string | null;
  note: string | null;
  createdAt: string;
}

export interface OpenSession {
  id: string;
  playerId: string;
  playerName: string;
  playerNickname: string | null;
  openedAt: string;
  entries: LedgerEntry[];
  resultCents: number;
}

export interface ClosedSession {
  id: string;
  playerId: string;
  playerName: string;
  openedAt: string;
  closedAt: string;
  resultCents: number;
  reopenedCount: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

export const LEDGER_PAGE_SIZE = 20;

const ENTRY_COLUMNS =
  'id, player_id, session_id, kind, amount_cents, paid_upfront, payment_method, effect_cents, reverses_id, note, created_at, reversed_by_id' as const;

interface EntryRow {
  id: string;
  player_id: string;
  session_id: string | null;
  kind: string;
  amount_cents: number;
  paid_upfront: boolean;
  payment_method: string | null;
  effect_cents: number;
  reverses_id: string | null;
  note: string | null;
  created_at: string;
  reversed_by_id: string | null;
}

function toEntry(row: EntryRow): LedgerEntry {
  if (!isEntryKind(row.kind)) throw new Error(`Tipo de lançamento desconhecido: ${row.kind}`);
  return {
    id: row.id,
    playerId: row.player_id,
    sessionId: row.session_id,
    kind: row.kind,
    amountCents: row.amount_cents,
    paidUpfront: row.paid_upfront,
    paymentMethod: isPaymentMethod(row.payment_method) ? row.payment_method : null,
    effectCents: row.effect_cents,
    reversesId: row.reverses_id,
    reversedById: row.reversed_by_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

function range(page: number): [number, number] {
  const from = (Math.max(1, page) - 1) * LEDGER_PAGE_SIZE;
  return [from, from + LEDGER_PAGE_SIZE - 1];
}

// ----------------------------------------------------------------------------- escrita

export async function recordMovement(playerId: string, data: EntryFormData): Promise<string> {
  if (data.kind === 'cash_out') {
    const { data: id, error } = await supabase.rpc('record_cash_out', {
      target_player_id: playerId,
      amount_cents: data.amountCents,
      entry_note: data.note ?? undefined,
    });
    if (error) throw error;
    return id;
  }

  if (data.kind === 'payment_in' || data.kind === 'payout') {
    if (!data.paymentMethodId) throw new Error('Forma de pagamento obrigatória');
    const { data: id, error } = await supabase.rpc('record_payment', {
      target_player_id: playerId,
      entry_kind: data.kind,
      amount_cents: data.amountCents,
      method_id: data.paymentMethodId,
      entry_note: data.note ?? undefined,
    });
    if (error) throw error;
    return id;
  }

  const { data: id, error } = await supabase.rpc('record_entry', {
    target_player_id: playerId,
    entry_kind: data.kind,
    amount_cents: data.amountCents,
    paid_upfront: data.paidUpfront,
    method_id: data.paymentMethodId ?? undefined,
    entry_note: data.note ?? undefined,
  });
  if (error) throw error;
  return id;
}

export async function reverseEntry(entryId: string, note: string): Promise<string> {
  const { data, error } = await supabase.rpc('reverse_entry', {
    target_entry_id: entryId,
    entry_note: note,
  });
  if (error) throw error;
  return data;
}

export async function closeSession(sessionId: string): Promise<number> {
  const { data, error } = await supabase.rpc('close_player_session', {
    target_session_id: sessionId,
  });
  if (error) throw error;
  return data;
}

export async function closeAllSessions(clubId: string): Promise<number> {
  const { data, error } = await supabase.rpc('close_all_sessions', { target_club_id: clubId });
  if (error) throw error;
  return data;
}

export async function reopenSession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('reopen_session', { target_session_id: sessionId });
  if (error) throw error;
}

// ----------------------------------------------------------------------------- leitura

/** Sessões abertas do clube, com os lançamentos de cada uma. */
export async function fetchOpenSessions(clubId: string): Promise<OpenSession[]> {
  const { data, error } = await supabase
    .from('player_sessions')
    .select(
      `id, player_id, opened_at, player:players(full_name, nickname), entries:ledger_entries(${ENTRY_COLUMNS})`,
    )
    .eq('club_id', clubId)
    .eq('status', 'open')
    .order('opened_at', { ascending: true })
    .order('created_at', { referencedTable: 'ledger_entries', ascending: true });
  if (error) throw error;

  return data.map((row) => {
    const entries = (row.entries as unknown as EntryRow[]).map(toEntry);
    return {
      id: row.id,
      playerId: row.player_id,
      playerName: row.player?.full_name ?? '—',
      playerNickname: row.player?.nickname ?? null,
      openedAt: row.opened_at,
      entries,
      resultCents: entries.reduce((total, entry) => total + entry.effectCents, 0),
    };
  });
}

export async function fetchPlayerEntries(
  playerId: string,
  page: number,
): Promise<Paged<LedgerEntry>> {
  const [from, to] = range(page);
  const { data, error, count } = await supabase
    .from('ledger_entries')
    .select(ENTRY_COLUMNS, { count: 'exact' })
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: (data as unknown as EntryRow[]).map(toEntry), total: count ?? 0 };
}

export async function fetchClosedSessions(params: {
  clubId: string;
  playerId?: string;
  page: number;
}): Promise<Paged<ClosedSession>> {
  const [from, to] = range(params.page);
  let query = supabase
    .from('player_sessions')
    .select(
      'id, player_id, opened_at, closed_at, result_cents, reopened_count, player:players(full_name)',
      {
        count: 'exact',
      },
    )
    .eq('club_id', params.clubId)
    .eq('status', 'closed');
  if (params.playerId) query = query.eq('player_id', params.playerId);

  const { data, error, count } = await query
    .order('closed_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return {
    items: data.map((row) => ({
      id: row.id,
      playerId: row.player_id,
      playerName: row.player?.full_name ?? '—',
      openedAt: row.opened_at,
      closedAt: row.closed_at ?? row.opened_at,
      resultCents: row.result_cents ?? 0,
      reopenedCount: row.reopened_count,
    })),
    total: count ?? 0,
  };
}

/** Lançamentos ainda em sessões abertas (central "Desfazer"), mais novos primeiro. */
export async function fetchOpenEntries(
  clubId: string,
  page: number,
): Promise<Paged<LedgerEntry & { playerName: string }>> {
  const [from, to] = range(page);
  const { data, error, count } = await supabase
    .from('ledger_entries')
    .select(`${ENTRY_COLUMNS}, player:players(full_name), session:player_sessions!inner(status)`, {
      count: 'exact',
    })
    .eq('club_id', clubId)
    .eq('session.status', 'open')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return {
    items: (data as unknown as (EntryRow & { player: { full_name: string } | null })[]).map(
      (row) => ({
        ...toEntry(row),
        playerName: row.player?.full_name ?? '—',
      }),
    ),
    total: count ?? 0,
  };
}

export interface ReceiptData {
  entry: LedgerEntry;
  playerName: string;
  clubName: string;
  balanceCents: number;
}

export async function fetchReceipt(entryId: string): Promise<ReceiptData | null> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select(`${ENTRY_COLUMNS}, club:clubs(name)`)
    .eq('id', entryId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as EntryRow & { club: { name: string } | null };

  const { data: player, error: playerError } = await supabase
    .from('player_overview')
    .select('full_name, balance_cents')
    .eq('id', row.player_id)
    .maybeSingle();
  if (playerError) throw playerError;

  return {
    entry: toEntry(row),
    playerName: player?.full_name ?? '—',
    clubName: row.club?.name ?? '',
    balanceCents: player?.balance_cents ?? 0,
  };
}

// ----------------------------------------------------------------------------- tempo real

/** Avisa quando lançamentos ou sessões do clube mudam. Retorna a função para cancelar. */
export function subscribeToLedger(clubId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`ledger:${clubId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ledger_entries', filter: `club_id=eq.${clubId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'player_sessions', filter: `club_id=eq.${clubId}` },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
