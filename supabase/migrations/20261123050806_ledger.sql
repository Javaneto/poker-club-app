-- Fase 5 — conta do jogador (ledger) e sessões.
--
-- * ledger_entries é IMUTÁVEL: sem UPDATE/DELETE. Desfazer = lançamento de estorno (reverses_id).
-- * effect_cents guarda o efeito no resultado (calculado no INSERT, nunca muda):
--   positivo = clube deve ao jogador; negativo = jogador deve ao clube.
-- * Saldo do jogador = soma de effect_cents (saldo corrido único, ver PLAN.md).
-- * Lançamentos de jogo entram sempre na sessão aberta do jogador (criada se preciso).
--   Pagamentos entram na sessão aberta, se houver, ou ficam avulsos (session_id null).
-- * Toda escrita é por RPC transacional; tabelas sem políticas de escrita.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.ledger_entry_kind as enum (
  'buy_in', 'tournament_entry', 'cash_out', 'payment_in', 'payout', 'bar_charge', 'reversal'
);

create type public.payment_method as enum ('cash', 'pix', 'debit_card', 'credit_card', 'other');

create type public.player_session_status as enum ('open', 'closed');

-- Quem opera a conta do jogador (lança, recebe, estorna, finaliza).
create function public.can_operate_ledger(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_club_role(
    target_club_id,
    array['owner', 'manager', 'cashier', 'director']::public.club_role[]
  );
$$;

revoke execute on function public.can_operate_ledger(uuid) from public, anon;
grant execute on function public.can_operate_ledger(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sessões do jogador
-- ---------------------------------------------------------------------------

create table public.player_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  status public.player_session_status not null default 'open',
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users (id) on delete set null default auth.uid(),
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  -- Resultado congelado no fechamento (soma dos efeitos da sessão).
  result_cents bigint,
  reopened_count integer not null default 0,
  last_reopened_at timestamptz,
  last_reopened_by uuid references auth.users (id) on delete set null,
  constraint player_sessions_closed_consistency check (
    (status = 'open' and closed_at is null and result_cents is null)
    or (status = 'closed' and closed_at is not null and result_cents is not null)
  )
);

-- No máximo uma sessão aberta por jogador.
create unique index player_sessions_one_open_idx
  on public.player_sessions (player_id) where status = 'open';
create index player_sessions_club_status_idx
  on public.player_sessions (club_id, status, closed_at desc);
create index player_sessions_player_idx on public.player_sessions (player_id, opened_at desc);

create trigger player_sessions_audit
  after insert or update or delete on public.player_sessions
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Lançamentos
-- ---------------------------------------------------------------------------

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  session_id uuid references public.player_sessions (id) on delete restrict,
  kind public.ledger_entry_kind not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_upfront boolean not null default false,
  payment_method public.payment_method,
  effect_cents bigint not null,
  reverses_id uuid unique references public.ledger_entries (id) on delete restrict,
  -- Vínculos preenchidos nas próximas fases (sem FK até as tabelas existirem).
  cash_session_id uuid,
  table_id uuid,
  tournament_id uuid,
  note text check (char_length(note) <= 500),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint ledger_entries_reversal_link check ((kind = 'reversal') = (reverses_id is not null)),
  constraint ledger_entries_paid_upfront_kinds check (
    not paid_upfront or kind in ('buy_in', 'tournament_entry')
  ),
  constraint ledger_entries_payment_method_required check (
    case
      when kind in ('payment_in', 'payout') then payment_method is not null
      when kind in ('buy_in', 'tournament_entry') then (payment_method is not null) = paid_upfront
      when kind = 'reversal' then true
      else payment_method is null
    end
  )
);

create index ledger_entries_player_idx on public.ledger_entries (player_id, created_at desc);
create index ledger_entries_session_idx on public.ledger_entries (session_id);
create index ledger_entries_club_created_idx on public.ledger_entries (club_id, created_at desc);

create trigger ledger_entries_audit
  after insert or update or delete on public.ledger_entries
  for each row execute function public.audit_row_change();

-- Imutável: nem o dono do banco via API altera ou apaga um lançamento.
create function public.ledger_entries_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Lançamentos não podem ser alterados nem apagados. Use um estorno.'
    using errcode = '42501';
end;
$$;

create trigger ledger_entries_no_update_delete
  before update or delete on public.ledger_entries
  for each row execute function public.ledger_entries_immutable();

-- Efeito de um lançamento (espelha features/ledger/domain/result.ts).
create function public.ledger_effect(
  entry_kind public.ledger_entry_kind,
  amount bigint,
  paid boolean,
  reversed_effect bigint default null
)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case entry_kind
    when 'buy_in' then case when paid then 0 else -amount end
    when 'tournament_entry' then case when paid then 0 else -amount end
    when 'cash_out' then amount
    when 'payment_in' then amount
    when 'payout' then -amount
    when 'bar_charge' then -amount
    when 'reversal' then -reversed_effect
  end;
$$;

-- Campo calculado para a API: id do estorno deste lançamento (null se não foi estornado).
-- Uso: select=*,reversed_by_id. Roda com as permissões de quem consulta (RLS vale).
create function public.reversed_by_id(entry public.ledger_entries)
returns uuid
language sql
stable
set search_path = ''
as $$
  select r.id from public.ledger_entries r where r.reverses_id = entry.id;
$$;

-- ---------------------------------------------------------------------------
-- RLS (leitura por membros; escrita só por RPC)
-- ---------------------------------------------------------------------------

alter table public.player_sessions enable row level security;
alter table public.ledger_entries enable row level security;

create policy player_sessions_select on public.player_sessions
  for select to authenticated using (public.is_club_member(club_id));

create policy ledger_entries_select on public.ledger_entries
  for select to authenticated using (public.is_club_member(club_id));

revoke insert, update, delete, truncate on public.player_sessions, public.ledger_entries
  from authenticated;
revoke all on public.player_sessions, public.ledger_entries from anon;

-- Realtime: telas de movimentação atualizam ao vivo (a RLS vale também aqui).
alter publication supabase_realtime add table public.ledger_entries, public.player_sessions;

-- ---------------------------------------------------------------------------
-- Visão: jogadores com saldo (para lista, filtros e ficha)
-- ---------------------------------------------------------------------------

create view public.player_overview
with (security_invoker = true)
as
select
  p.id,
  p.club_id,
  p.full_name,
  p.nickname,
  p.phone,
  p.cpf,
  p.email,
  p.birth_date,
  p.notes,
  p.active,
  p.normalized_name,
  p.search_text,
  p.created_at,
  coalesce(b.balance_cents, 0)::bigint as balance_cents,
  s.id as open_session_id,
  coalesce(o.open_result_cents, 0)::bigint as open_result_cents
from public.players p
left join lateral (
  select sum(e.effect_cents) as balance_cents
  from public.ledger_entries e
  where e.player_id = p.id
) b on true
left join public.player_sessions s on s.player_id = p.id and s.status = 'open'
left join lateral (
  select sum(e.effect_cents) as open_result_cents
  from public.ledger_entries e
  where e.session_id = s.id
) o on true;

grant select on public.player_overview to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers internos
-- ---------------------------------------------------------------------------

create function public.ledger_require_operator(target_club_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_operate_ledger(target_club_id) then
    raise exception 'Seu papel no clube não permite fazer lançamentos.' using errcode = '42501';
  end if;
end;
$$;

-- Trava o jogador (serializa lançamentos simultâneos) e devolve o clube.
create function public.ledger_lock_player(target_player_id uuid, require_active boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club_id uuid;
  is_active boolean;
begin
  select club_id, active into target_club_id, is_active
  from public.players
  where id = target_player_id
  for update;

  if target_club_id is null then
    raise exception 'Jogador não encontrado.' using errcode = 'P0002';
  end if;

  perform public.ledger_require_operator(target_club_id);

  if require_active and not is_active then
    raise exception 'Jogador inativo. Reative o cadastro para lançar.' using errcode = '22023';
  end if;

  return target_club_id;
end;
$$;

create function public.ledger_open_session_id(target_player_id uuid, create_if_missing boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  session uuid;
  target_club_id uuid;
begin
  select id into session
  from public.player_sessions
  where player_id = target_player_id and status = 'open';

  if session is null and create_if_missing then
    select club_id into target_club_id from public.players where id = target_player_id;
    insert into public.player_sessions (club_id, player_id)
    values (target_club_id, target_player_id)
    returning id into session;
  end if;

  return session;
end;
$$;

revoke execute on function
  public.ledger_require_operator(uuid),
  public.ledger_lock_player(uuid, boolean),
  public.ledger_open_session_id(uuid, boolean)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs de lançamento
-- ---------------------------------------------------------------------------

-- Entrada de jogo: compra no cash, inscrição/rebuy/add-on de torneio, comanda fiada.
create function public.record_entry(
  target_player_id uuid,
  entry_kind public.ledger_entry_kind,
  amount_cents bigint,
  paid_upfront boolean default false,
  method public.payment_method default null,
  entry_note text default null,
  target_table_id uuid default null,
  target_tournament_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club_id uuid;
  session uuid;
  new_id uuid;
begin
  if entry_kind not in ('buy_in', 'tournament_entry', 'bar_charge') then
    raise exception 'Tipo de lançamento inválido para entrada.' using errcode = '22023';
  end if;
  if entry_kind = 'bar_charge' and paid_upfront then
    raise exception 'Comanda paga na hora não entra na conta do jogador.' using errcode = '22023';
  end if;
  if paid_upfront and method is null then
    raise exception 'Informe a forma de pagamento.' using errcode = '22023';
  end if;

  target_club_id := public.ledger_lock_player(target_player_id, true);
  session := public.ledger_open_session_id(target_player_id, true);

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, paid_upfront, payment_method,
    effect_cents, note, table_id, tournament_id
  ) values (
    target_club_id, target_player_id, session, entry_kind, amount_cents, paid_upfront,
    case when paid_upfront then method end,
    public.ledger_effect(entry_kind, amount_cents, paid_upfront),
    nullif(btrim(entry_note), ''), target_table_id, target_tournament_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Saída: jogador devolve fichas no cash.
create function public.record_cash_out(
  target_player_id uuid,
  amount_cents bigint,
  entry_note text default null,
  target_table_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club_id uuid;
  session uuid;
  new_id uuid;
begin
  target_club_id := public.ledger_lock_player(target_player_id, true);
  session := public.ledger_open_session_id(target_player_id, true);

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, effect_cents, note, table_id
  ) values (
    target_club_id, target_player_id, session, 'cash_out', amount_cents,
    public.ledger_effect('cash_out', amount_cents, false),
    nullif(btrim(entry_note), ''), target_table_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Pagamento: jogador paga o clube (payment_in) ou clube paga o jogador (payout).
-- Abate o saldo corrido; entra na sessão aberta, se houver, senão fica avulso.
create function public.record_payment(
  target_player_id uuid,
  entry_kind public.ledger_entry_kind,
  amount_cents bigint,
  method public.payment_method,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club_id uuid;
  new_id uuid;
begin
  if entry_kind not in ('payment_in', 'payout') then
    raise exception 'Tipo de pagamento inválido.' using errcode = '22023';
  end if;
  if method is null then
    raise exception 'Informe a forma de pagamento.' using errcode = '22023';
  end if;

  -- Pagamento vale também para jogador inativo (quitar dívida antiga).
  target_club_id := public.ledger_lock_player(target_player_id, false);

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, payment_method, effect_cents, note
  ) values (
    target_club_id, target_player_id,
    public.ledger_open_session_id(target_player_id, false),
    entry_kind, amount_cents, method,
    public.ledger_effect(entry_kind, amount_cents, false),
    nullif(btrim(entry_note), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Estorno: novo lançamento que anula o efeito do original, na mesma sessão.
create function public.reverse_entry(target_entry_id uuid, entry_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  original public.ledger_entries;
  session_status public.player_session_status;
  new_id uuid;
begin
  select * into original from public.ledger_entries where id = target_entry_id;

  if original.id is null then
    raise exception 'Lançamento não encontrado.' using errcode = 'P0002';
  end if;

  perform public.ledger_lock_player(original.player_id, false);

  if original.kind = 'reversal' then
    raise exception 'Um estorno não pode ser estornado.' using errcode = '22023';
  end if;
  if exists (select 1 from public.ledger_entries where reverses_id = original.id) then
    raise exception 'Este lançamento já foi estornado.' using errcode = '22023';
  end if;

  if original.session_id is not null then
    select status into session_status from public.player_sessions where id = original.session_id;
    if session_status = 'closed' then
      raise exception 'A sessão deste lançamento está finalizada. Reabra a sessão para estornar.'
        using errcode = '22023';
    end if;
  end if;

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, payment_method, effect_cents,
    reverses_id, note, cash_session_id, table_id, tournament_id
  ) values (
    original.club_id, original.player_id, original.session_id, 'reversal', original.amount_cents,
    original.payment_method,
    public.ledger_effect('reversal', original.amount_cents, false, original.effect_cents),
    original.id, nullif(btrim(entry_note), ''),
    original.cash_session_id, original.table_id, original.tournament_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs de sessão
-- ---------------------------------------------------------------------------

create function public.close_session_internal(target_session_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  result bigint;
begin
  select coalesce(sum(effect_cents), 0) into result
  from public.ledger_entries
  where session_id = target_session_id;

  update public.player_sessions
     set status = 'closed',
         closed_at = now(),
         closed_by = auth.uid(),
         result_cents = result
   where id = target_session_id;

  return result;
end;
$$;

revoke execute on function public.close_session_internal(uuid) from public, anon, authenticated;

create function public.close_player_session(target_session_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  session public.player_sessions;
begin
  select * into session from public.player_sessions where id = target_session_id for update;

  if session.id is null then
    raise exception 'Sessão não encontrada.' using errcode = 'P0002';
  end if;
  perform public.ledger_require_operator(session.club_id);
  if session.status = 'closed' then
    raise exception 'Esta sessão já foi finalizada.' using errcode = '22023';
  end if;

  return public.close_session_internal(session.id);
end;
$$;

-- "Finalizar todos": opera sobre o estado atual do banco, não sobre a lista da tela.
create function public.close_all_sessions(target_club_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
  closed integer := 0;
begin
  perform public.ledger_require_operator(target_club_id);

  for session_id in
    select id from public.player_sessions
    where club_id = target_club_id and status = 'open'
    for update
  loop
    perform public.close_session_internal(session_id);
    closed := closed + 1;
  end loop;

  return closed;
end;
$$;

-- Reabrir para corrigir um fechamento (dono/gerente). Auditado pelo gatilho.
create function public.reopen_session(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  session public.player_sessions;
begin
  select * into session from public.player_sessions where id = target_session_id for update;

  if session.id is null then
    raise exception 'Sessão não encontrada.' using errcode = 'P0002';
  end if;
  if not public.has_club_role(session.club_id, array['owner', 'manager']::public.club_role[]) then
    raise exception 'Apenas o dono ou o gerente pode reabrir sessões.' using errcode = '42501';
  end if;
  if session.status = 'open' then
    raise exception 'Esta sessão já está aberta.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.player_sessions
    where player_id = session.player_id and status = 'open'
  ) then
    raise exception 'O jogador já tem uma sessão aberta. Finalize-a antes de reabrir outra.'
      using errcode = '22023';
  end if;

  update public.player_sessions
     set status = 'open',
         closed_at = null,
         closed_by = null,
         result_cents = null,
         reopened_count = reopened_count + 1,
         last_reopened_at = now(),
         last_reopened_by = auth.uid()
   where id = session.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Excluir jogador: agora recusa quem tem lançamentos (regra da Fase 4)
-- ---------------------------------------------------------------------------

create or replace function public.delete_player(target_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club_id uuid;
begin
  select club_id into target_club_id from public.players where id = target_player_id;

  if target_club_id is null then
    raise exception 'Jogador não encontrado.' using errcode = 'P0002';
  end if;

  if not public.has_club_role(target_club_id, array['owner', 'manager']::public.club_role[]) then
    raise exception 'Apenas o dono ou o gerente pode excluir jogadores.' using errcode = '42501';
  end if;

  if exists (select 1 from public.ledger_entries where player_id = target_player_id) then
    raise exception 'Jogador com lançamentos não pode ser excluído. Use Inativar.'
      using errcode = '23503';
  end if;

  delete from public.player_sessions where player_id = target_player_id;
  delete from public.players where id = target_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões das RPCs
-- ---------------------------------------------------------------------------

revoke execute on function
  public.record_entry(uuid, public.ledger_entry_kind, bigint, boolean, public.payment_method, text, uuid, uuid),
  public.record_cash_out(uuid, bigint, text, uuid),
  public.record_payment(uuid, public.ledger_entry_kind, bigint, public.payment_method, text),
  public.reverse_entry(uuid, text),
  public.close_player_session(uuid),
  public.close_all_sessions(uuid),
  public.reopen_session(uuid)
from public, anon;

grant execute on function
  public.record_entry(uuid, public.ledger_entry_kind, bigint, boolean, public.payment_method, text, uuid, uuid),
  public.record_cash_out(uuid, bigint, text, uuid),
  public.record_payment(uuid, public.ledger_entry_kind, bigint, public.payment_method, text),
  public.reverse_entry(uuid, text),
  public.close_player_session(uuid),
  public.close_all_sessions(uuid),
  public.reopen_session(uuid)
to authenticated;
