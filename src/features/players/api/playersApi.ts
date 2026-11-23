import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { escapeLike, pageRange, toSearchTerm } from '../domain/search';
import type { PlayerFormData } from '../schemas';

type OverviewRow = Database['public']['Views']['player_overview']['Row'];

export interface Player {
  id: string;
  fullName: string;
  nickname: string | null;
  phone: string | null;
  cpf: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  /** Saldo corrido: soma de todos os lançamentos (+ clube deve, − jogador deve). */
  balanceCents: number;
  openSessionId: string | null;
  /** Resultado só da sessão aberta. */
  openResultCents: number;
}

export type PlayerStatusFilter = 'active' | 'inactive' | 'all' | 'playing' | 'owing' | 'credit';
export type PlayerSort = 'name' | 'recent';

export interface PlayerListParams {
  clubId: string;
  search: string;
  status: PlayerStatusFilter;
  sort: PlayerSort;
  page: number;
}

export interface PlayerPage {
  items: Player[];
  total: number;
}

export interface UpcomingBirthday {
  playerId: string;
  fullName: string;
  nickname: string | null;
  birthDate: string;
  nextBirthday: string;
  turningAge: number;
}

const PLAYER_COLUMNS =
  'id, full_name, nickname, phone, cpf, email, birth_date, notes, active, created_at, balance_cents, open_session_id, open_result_cents' as const;

type PlayerColumns = Pick<
  OverviewRow,
  | 'id'
  | 'full_name'
  | 'nickname'
  | 'phone'
  | 'cpf'
  | 'email'
  | 'birth_date'
  | 'notes'
  | 'active'
  | 'created_at'
  | 'balance_cents'
  | 'open_session_id'
  | 'open_result_cents'
>;

function toPlayer(row: PlayerColumns): Player {
  return {
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname,
    phone: row.phone,
    cpf: row.cpf,
    email: row.email,
    birthDate: row.birth_date,
    notes: row.notes,
    active: row.active,
    createdAt: row.created_at,
    balanceCents: row.balance_cents ?? 0,
    openSessionId: row.open_session_id,
    openResultCents: row.open_result_cents ?? 0,
  };
}

function toRow(data: PlayerFormData) {
  return {
    full_name: data.fullName,
    nickname: data.nickname,
    phone: data.phone,
    cpf: data.cpf,
    email: data.email,
    birth_date: data.birthDate,
    notes: data.notes,
  };
}

export async function listPlayers(params: PlayerListParams): Promise<PlayerPage> {
  const [from, to] = pageRange(params.page);
  let query = supabase
    .from('player_overview')
    .select(PLAYER_COLUMNS, { count: 'exact' })
    .eq('club_id', params.clubId);

  switch (params.status) {
    case 'active':
      query = query.eq('active', true);
      break;
    case 'inactive':
      query = query.eq('active', false);
      break;
    case 'playing':
      query = query.not('open_session_id', 'is', null);
      break;
    case 'owing':
      query = query.lt('balance_cents', 0);
      break;
    case 'credit':
      query = query.gt('balance_cents', 0);
      break;
    case 'all':
      break;
  }

  const term = toSearchTerm(params.search);
  if (term) query = query.ilike('search_text', `%${escapeLike(term)}%`);

  query =
    params.sort === 'recent'
      ? query.order('created_at', { ascending: false })
      : query.order('normalized_name', { ascending: true });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { items: data.map(toPlayer), total: count ?? 0 };
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('player_overview')
    .select(PLAYER_COLUMNS)
    .eq('id', playerId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPlayer(data) : null;
}

export async function createPlayer(clubId: string, data: PlayerFormData): Promise<{ id: string }> {
  const { data: row, error } = await supabase
    .from('players')
    .insert({ club_id: clubId, ...toRow(data) })
    .select('id')
    .single();
  if (error) throw error;
  return { id: row.id };
}

export async function updatePlayer(
  playerId: string,
  data: PlayerFormData,
): Promise<{ id: string }> {
  const { data: row, error } = await supabase
    .from('players')
    .update(toRow(data))
    .eq('id', playerId)
    .select('id')
    .single();
  if (error) throw error;
  return { id: row.id };
}

export async function setPlayerActive(playerId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('players').update({ active }).eq('id', playerId);
  if (error) throw error;
}

export async function deletePlayer(playerId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_player', { target_player_id: playerId });
  if (error) throw error;
}

export async function fetchUpcomingBirthdays(
  clubId: string,
  daysAhead = 30,
): Promise<UpcomingBirthday[]> {
  const { data, error } = await supabase.rpc('upcoming_birthdays', {
    target_club_id: clubId,
    days_ahead: daysAhead,
  });
  if (error) throw error;
  return data.map((row) => ({
    playerId: row.player_id,
    fullName: row.full_name,
    nickname: row.nickname,
    birthDate: row.birth_date,
    nextBirthday: row.next_birthday,
    turningAge: row.turning_age,
  }));
}
