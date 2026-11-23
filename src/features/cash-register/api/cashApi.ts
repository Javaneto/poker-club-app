import { supabase } from '@/lib/supabase';
import {
  isEntryKind,
  isPaymentMethod,
  type EntryKind,
  type PaymentMethod,
} from '@/features/ledger/domain/result';

export interface PaymentMethodOption {
  id: string;
  kind: PaymentMethod;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface CashSession {
  id: string;
  status: 'open' | 'closed';
  openingCents: number;
  openedAt: string;
  closedAt: string | null;
  expectedCashCents: number | null;
  countedCents: number | null;
  differenceCents: number | null;
  closingNote: string | null;
}

export interface MethodTotal {
  paymentMethodId: string | null;
  name: string;
  kind: PaymentMethod;
  inCents: number;
  outCents: number;
}

export interface CashSummary {
  openingCents: number;
  cashInCents: number;
  cashOutCents: number;
  depositsCents: number;
  withdrawalsCents: number;
  expectedCashCents: number;
  byMethod: MethodTotal[];
}

/** Linha da lista de movimentações do caixa (lançamento de jogador ou sangria/suprimento). */
export type CashTimelineItem =
  | {
      type: 'entry';
      id: string;
      createdAt: string;
      kind: EntryKind;
      playerName: string;
      methodName: string;
      paymentKind: PaymentMethod | null;
      cashFlowCents: number;
      note: string | null;
    }
  | {
      type: 'movement';
      id: string;
      createdAt: string;
      kind: 'withdrawal' | 'deposit';
      amountCents: number;
      note: string | null;
    };

export interface Paged<T> {
  items: T[];
  total: number;
}

export const CASH_PAGE_SIZE = 20;

const SESSION_COLUMNS =
  'id, status, opening_cents, opened_at, closed_at, expected_cash_cents, counted_cents, difference_cents, closing_note' as const;

interface SessionRow {
  id: string;
  status: 'open' | 'closed';
  opening_cents: number;
  opened_at: string;
  closed_at: string | null;
  expected_cash_cents: number | null;
  counted_cents: number | null;
  difference_cents: number | null;
  closing_note: string | null;
}

function toSession(row: SessionRow): CashSession {
  return {
    id: row.id,
    status: row.status,
    openingCents: row.opening_cents,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    expectedCashCents: row.expected_cash_cents,
    countedCents: row.counted_cents,
    differenceCents: row.difference_cents,
    closingNote: row.closing_note,
  };
}

// ----------------------------------------------------------------------------- formas de pagamento

export async function fetchPaymentMethods(clubId: string): Promise<PaymentMethodOption[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, kind, name, active, sort_order')
    .eq('club_id', clubId)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    active: row.active,
    sortOrder: row.sort_order,
  }));
}

export async function createPaymentMethod(
  clubId: string,
  input: { name: string; kind: PaymentMethod },
): Promise<void> {
  const { error } = await supabase
    .from('payment_methods')
    .insert({ club_id: clubId, name: input.name, kind: input.kind, sort_order: 50 });
  if (error) throw error;
}

export async function updatePaymentMethod(
  id: string,
  changes: { name?: string; active?: boolean },
): Promise<void> {
  const { error } = await supabase.from('payment_methods').update(changes).eq('id', id);
  if (error) throw error;
}

// ----------------------------------------------------------------------------- caixa

export async function fetchOpenCashSession(clubId: string): Promise<CashSession | null> {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select(SESSION_COLUMNS)
    .eq('club_id', clubId)
    .eq('status', 'open')
    .maybeSingle();
  if (error) throw error;
  return data ? toSession(data) : null;
}

export async function fetchCashSession(sessionId: string): Promise<CashSession | null> {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? toSession(data) : null;
}

export async function fetchCashSummary(sessionId: string): Promise<CashSummary> {
  const { data, error } = await supabase.rpc('cash_session_summary', {
    target_session_id: sessionId,
  });
  if (error) throw error;
  const row = data[0];
  if (!row) throw new Error('Caixa não encontrado');
  const methods = Array.isArray(row.by_method) ? row.by_method : [];
  return {
    openingCents: row.opening_cents,
    cashInCents: row.cash_in_cents,
    cashOutCents: row.cash_out_cents,
    depositsCents: row.deposits_cents,
    withdrawalsCents: row.withdrawals_cents,
    expectedCashCents: row.expected_cash_cents,
    byMethod: methods.flatMap((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return [];
      const kind = item.kind;
      if (!isPaymentMethod(kind)) return [];
      return [
        {
          paymentMethodId:
            typeof item.payment_method_id === 'string' ? item.payment_method_id : null,
          name: typeof item.name === 'string' ? item.name : kind,
          kind,
          inCents: Number(item.in_cents ?? 0),
          outCents: Number(item.out_cents ?? 0),
        },
      ];
    }),
  };
}

/** Lançamentos com dinheiro + sangrias/suprimentos do caixa, em ordem cronológica. */
export async function fetchCashTimeline(sessionId: string): Promise<CashTimelineItem[]> {
  const [entries, movements] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select(
        'id, created_at, kind, payment_method, cash_flow_cents, note, player:players(full_name), method:payment_methods(name)',
      )
      .eq('cash_session_id', sessionId)
      .order('created_at'),
    supabase
      .from('cash_movements')
      .select('id, created_at, kind, amount_cents, note')
      .eq('cash_session_id', sessionId)
      .order('created_at'),
  ]);
  if (entries.error) throw entries.error;
  if (movements.error) throw movements.error;

  const items: CashTimelineItem[] = [
    ...entries.data.flatMap((row): CashTimelineItem[] => {
      if (!isEntryKind(row.kind)) return [];
      return [
        {
          type: 'entry',
          id: row.id,
          createdAt: row.created_at,
          kind: row.kind,
          playerName: row.player?.full_name ?? '—',
          methodName: row.method?.name ?? '—',
          paymentKind: isPaymentMethod(row.payment_method) ? row.payment_method : null,
          cashFlowCents: row.cash_flow_cents,
          note: row.note,
        },
      ];
    }),
    ...movements.data.map((row): CashTimelineItem => ({
      type: 'movement',
      id: row.id,
      createdAt: row.created_at,
      kind: row.kind,
      amountCents: row.amount_cents,
      note: row.note,
    })),
  ];
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function fetchCashHistory(clubId: string, page: number): Promise<Paged<CashSession>> {
  const from = (Math.max(1, page) - 1) * CASH_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('cash_sessions')
    .select(SESSION_COLUMNS, { count: 'exact' })
    .eq('club_id', clubId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .range(from, from + CASH_PAGE_SIZE - 1);
  if (error) throw error;
  return { items: data.map(toSession), total: count ?? 0 };
}

export async function openCashSession(clubId: string, openingCents: number): Promise<string> {
  const { data, error } = await supabase.rpc('open_cash_session', {
    target_club_id: clubId,
    opening_cents: openingCents,
  });
  if (error) throw error;
  return data;
}

export async function registerCashMovement(
  sessionId: string,
  kind: 'withdrawal' | 'deposit',
  amountCents: number,
  note: string | null,
): Promise<void> {
  const args = {
    target_session_id: sessionId,
    amount_cents: amountCents,
    movement_note: note ?? undefined,
  };
  const { error } =
    kind === 'withdrawal'
      ? await supabase.rpc('withdraw', args)
      : await supabase.rpc('deposit', args);
  if (error) throw error;
}

export async function closeCashSession(
  sessionId: string,
  countedCents: number,
  note: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc('close_cash_session', {
    target_session_id: sessionId,
    counted_cents: countedCents,
    note: note ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function setRequireOpenCashSession(clubId: string, required: boolean): Promise<void> {
  const { error } = await supabase
    .from('club_settings')
    .update({ require_open_cash_session: required })
    .eq('club_id', clubId);
  if (error) throw error;
}

export async function fetchRequireOpenCashSession(clubId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('club_settings')
    .select('require_open_cash_session')
    .eq('club_id', clubId)
    .single();
  if (error) throw error;
  return data.require_open_cash_session;
}

export function subscribeToCash(clubId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`cash:${clubId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_sessions', filter: `club_id=eq.${clubId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_movements', filter: `club_id=eq.${clubId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ledger_entries',
        filter: `club_id=eq.${clubId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
