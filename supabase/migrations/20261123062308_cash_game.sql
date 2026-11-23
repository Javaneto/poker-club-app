-- Fase 7 — Cash game.
--
-- * cash_tables: mesa com nome, blinds, limite de jogadores e status aberta/encerrada.
-- * cash_table_seats: quem está sentado (sentou/levantou). Um jogador em uma mesa por vez.
-- * cash_table_entries: rake, capilé (tip) e despesas da mesa. Imutáveis (desfazer = estorno).
--   Só registro: não movimentam o Caixa do Dia.
-- * Compras e devoluções da mesa são lançamentos do ledger (buy_in/cash_out com table_id),
--   feitos só pelas RPCs da mesa, com o jogador sentado.
-- * Conferência: compras − devoluções − rake − capilé = fichas na mesa. Encerra só com 0 e
--   sem jogadores sentados. Despesas não entram na conferência.
-- * Operam a mesa: dono, gerente, caixa, diretor e dealer.

-- ---------------------------------------------------------------------------
-- Tipos e permissão
-- ---------------------------------------------------------------------------

create type public.cash_table_status as enum ('open', 'closed');
create type public.cash_table_entry_kind as enum ('rake', 'tip', 'expense');

create function public.can_operate_cash_game(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_club_role(
    target_club_id,
    array['owner', 'manager', 'cashier', 'director', 'dealer']::public.club_role[]
  );
$$;

revoke execute on function public.can_operate_cash_game(uuid) from public, anon;
grant execute on function public.can_operate_cash_game(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.cash_tables (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  small_blind_cents bigint not null check (small_blind_cents > 0),
  big_blind_cents bigint not null check (big_blind_cents > 0),
  max_players smallint check (max_players between 2 and 12),
  note text check (char_length(note) <= 500),
  status public.cash_table_status not null default 'open',
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users (id) on delete set null default auth.uid(),
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  closing_note text check (char_length(closing_note) <= 500),
  constraint cash_tables_blinds_order check (small_blind_cents <= big_blind_cents),
  constraint cash_tables_closed_consistency check ((status = 'closed') = (closed_at is not null))
);

-- Nome único entre as mesas abertas do clube.
create unique index cash_tables_open_name_key
  on public.cash_tables (club_id, public.normalize_text(name)) where status = 'open';
create index cash_tables_club_status_idx on public.cash_tables (club_id, status, opened_at desc);

create trigger cash_tables_audit
  after insert or update or delete on public.cash_tables
  for each row execute function public.audit_row_change();

create table public.cash_table_seats (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  table_id uuid not null references public.cash_tables (id) on delete restrict,
  player_id uuid not null references public.players (id) on delete restrict,
  seated_at timestamptz not null default now(),
  seated_by uuid references auth.users (id) on delete set null default auth.uid(),
  left_at timestamptz,
  left_by uuid references auth.users (id) on delete set null,
  constraint cash_table_seats_left_after check (left_at is null or left_at >= seated_at)
);

-- Um jogador sentado em no máximo uma mesa por vez.
create unique index cash_table_seats_one_active_idx
  on public.cash_table_seats (player_id) where left_at is null;
create index cash_table_seats_table_idx on public.cash_table_seats (table_id, seated_at);

create trigger cash_table_seats_audit
  after insert or update or delete on public.cash_table_seats
  for each row execute function public.audit_row_change();

create table public.cash_table_entries (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  table_id uuid not null references public.cash_tables (id) on delete restrict,
  kind public.cash_table_entry_kind not null,
  amount_cents bigint not null check (amount_cents > 0),
  -- Estorno: mesmo tipo e valor do original, efeito inverso.
  reverses_id uuid unique references public.cash_table_entries (id) on delete restrict,
  note text check (char_length(note) <= 500),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index cash_table_entries_table_idx on public.cash_table_entries (table_id, created_at);

create trigger cash_table_entries_audit
  after insert or update or delete on public.cash_table_entries
  for each row execute function public.audit_row_change();

create trigger cash_table_entries_no_update_delete
  before update or delete on public.cash_table_entries
  for each row execute function public.ledger_entries_immutable();

-- Lançamentos do ledger passam a apontar para a mesa.
alter table public.ledger_entries
  add constraint ledger_entries_table_fkey
    foreign key (table_id) references public.cash_tables (id) on delete restrict;

create index ledger_entries_table_idx on public.ledger_entries (table_id) where table_id is not null;

-- ---------------------------------------------------------------------------
-- RLS (leitura por membros; escrita só por RPC)
-- ---------------------------------------------------------------------------

alter table public.cash_tables enable row level security;
alter table public.cash_table_seats enable row level security;
alter table public.cash_table_entries enable row level security;

create policy cash_tables_select on public.cash_tables
  for select to authenticated using (public.is_club_member(club_id));
create policy cash_table_seats_select on public.cash_table_seats
  for select to authenticated using (public.is_club_member(club_id));
create policy cash_table_entries_select on public.cash_table_entries
  for select to authenticated using (public.is_club_member(club_id));

revoke insert, update, delete, truncate
  on public.cash_tables, public.cash_table_seats, public.cash_table_entries
  from authenticated;
revoke all on public.cash_tables, public.cash_table_seats, public.cash_table_entries from anon;

alter publication supabase_realtime
  add table public.cash_tables, public.cash_table_seats, public.cash_table_entries;

-- ---------------------------------------------------------------------------
-- Conferência, jogadores e atividade (leitura; RLS de quem consulta)
-- ---------------------------------------------------------------------------

-- Espelha features/cash-game/domain/chips.ts.
create function public.cash_table_summary(target_table_id uuid)
returns table (
  purchases_cents bigint,
  returns_cents bigint,
  rake_cents bigint,
  tips_cents bigint,
  expenses_cents bigint,
  chips_cents bigint,
  seated_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with ledger as (
    select
      coalesce(sum(case
        when e.kind = 'buy_in' then e.amount_cents
        when e.kind = 'reversal' and o.kind = 'buy_in' then -e.amount_cents
        else 0 end), 0) as purchases,
      coalesce(sum(case
        when e.kind = 'cash_out' then e.amount_cents
        when e.kind = 'reversal' and o.kind = 'cash_out' then -e.amount_cents
        else 0 end), 0) as returns
    from public.ledger_entries e
    left join public.ledger_entries o on o.id = e.reverses_id
    where e.table_id = target_table_id
  ),
  table_entries as (
    select
      coalesce(sum(case when t.reverses_id is null then t.amount_cents else -t.amount_cents end)
        filter (where t.kind = 'rake'), 0) as rake,
      coalesce(sum(case when t.reverses_id is null then t.amount_cents else -t.amount_cents end)
        filter (where t.kind = 'tip'), 0) as tips,
      coalesce(sum(case when t.reverses_id is null then t.amount_cents else -t.amount_cents end)
        filter (where t.kind = 'expense'), 0) as expenses
    from public.cash_table_entries t
    where t.table_id = target_table_id
  ),
  seats as (
    select count(*)::integer as seated
    from public.cash_table_seats s
    where s.table_id = target_table_id and s.left_at is null
  )
  select
    l.purchases::bigint,
    l.returns::bigint,
    t.rake::bigint,
    t.tips::bigint,
    t.expenses::bigint,
    (l.purchases - l.returns - t.rake - t.tips)::bigint,
    s.seated
  from ledger l, table_entries t, seats s
  where exists (select 1 from public.cash_tables c where c.id = target_table_id);
$$;

grant execute on function public.cash_table_summary(uuid) to authenticated;

-- Jogadores que passaram pela mesa: compras, devoluções e tempo sentado.
create function public.cash_table_players(target_table_id uuid)
returns table (
  player_id uuid,
  full_name text,
  nickname text,
  seat_id uuid,
  seated_at timestamptz,
  completed_seconds bigint,
  buy_in_cents bigint,
  cash_out_cents bigint,
  first_seated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with seats as (
    select
      s.player_id,
      max(s.id::text) filter (where s.left_at is null)::uuid as seat_id,
      max(s.seated_at) filter (where s.left_at is null) as seated_at,
      coalesce(sum(extract(epoch from (s.left_at - s.seated_at)))
        filter (where s.left_at is not null), 0)::bigint as completed_seconds,
      min(s.seated_at) as first_seated_at
    from public.cash_table_seats s
    where s.table_id = target_table_id
    group by s.player_id
  ),
  money as (
    select
      e.player_id,
      coalesce(sum(case
        when e.kind = 'buy_in' then e.amount_cents
        when e.kind = 'reversal' and o.kind = 'buy_in' then -e.amount_cents
        else 0 end), 0)::bigint as buy_in,
      coalesce(sum(case
        when e.kind = 'cash_out' then e.amount_cents
        when e.kind = 'reversal' and o.kind = 'cash_out' then -e.amount_cents
        else 0 end), 0)::bigint as cash_out
    from public.ledger_entries e
    left join public.ledger_entries o on o.id = e.reverses_id
    where e.table_id = target_table_id
    group by e.player_id
  )
  select
    s.player_id,
    p.full_name,
    p.nickname,
    s.seat_id,
    s.seated_at,
    s.completed_seconds,
    coalesce(m.buy_in, 0),
    coalesce(m.cash_out, 0),
    s.first_seated_at
  from seats s
  join public.players p on p.id = s.player_id
  left join money m on m.player_id = s.player_id
  order by (s.seat_id is null), s.first_seated_at;
$$;

grant execute on function public.cash_table_players(uuid) to authenticated;

-- Atividade da mesa: lançamentos do ledger da mesa + rake/capilé/despesas, para lista paginada.
create view public.cash_table_activity
with (security_invoker = true)
as
select
  e.id,
  e.club_id,
  e.table_id,
  'ledger'::text as source,
  e.kind::text as kind,
  o.kind::text as reversed_kind,
  e.amount_cents,
  e.paid_upfront,
  pm.name as method_name,
  e.player_id,
  p.full_name as player_name,
  e.reverses_id,
  exists (select 1 from public.ledger_entries r where r.reverses_id = e.id) as is_reversed,
  e.note,
  e.created_at
from public.ledger_entries e
left join public.ledger_entries o on o.id = e.reverses_id
left join public.players p on p.id = e.player_id
left join public.payment_methods pm on pm.id = e.payment_method_id
where e.table_id is not null
union all
select
  t.id,
  t.club_id,
  t.table_id,
  'table'::text,
  t.kind::text,
  case when t.reverses_id is not null then t.kind::text end,
  t.amount_cents,
  false,
  null,
  null,
  null,
  t.reverses_id,
  exists (select 1 from public.cash_table_entries r where r.reverses_id = t.id),
  t.note,
  t.created_at
from public.cash_table_entries t;

grant select on public.cash_table_activity to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers internos
-- ---------------------------------------------------------------------------

-- Insere uma entrada de jogo (compra/inscrição/bar fiado/saída de fichas) sem checar papel:
-- quem chama já validou permissão e travou o jogador.
create function public.ledger_insert_game_entry(
  target_club_id uuid,
  target_player_id uuid,
  entry_kind public.ledger_entry_kind,
  amount_cents bigint,
  paid_upfront boolean,
  method_id uuid,
  entry_note text,
  target_table_id uuid,
  target_tournament_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid boolean := coalesce(paid_upfront, false);
  method_kind public.payment_method;
  cash_session uuid;
  session uuid;
  new_id uuid;
begin
  if entry_kind not in ('buy_in', 'tournament_entry', 'bar_charge', 'cash_out') then
    raise exception 'Tipo de lançamento inválido para entrada.' using errcode = '22023';
  end if;
  if amount_cents is null or amount_cents <= 0 then
    raise exception 'Informe um valor maior que zero.' using errcode = '22023';
  end if;
  if paid and entry_kind not in ('buy_in', 'tournament_entry') then
    raise exception 'Só compras e inscrições podem ser pagas na hora.' using errcode = '22023';
  end if;

  if paid then
    method_kind := public.cash_resolve_method(target_club_id, method_id);
    cash_session := public.cash_require_open_session(target_club_id);
  end if;

  session := public.ledger_open_session_id(target_player_id, true);

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, paid_upfront, payment_method,
    payment_method_id, effect_cents, cash_flow_cents, cash_session_id, note, table_id, tournament_id
  ) values (
    target_club_id, target_player_id, session, entry_kind, amount_cents, paid, method_kind,
    case when paid then method_id end,
    public.ledger_effect(entry_kind, amount_cents, paid),
    public.ledger_cash_flow(entry_kind, amount_cents, paid),
    cash_session, nullif(btrim(entry_note), ''), target_table_id, target_tournament_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

create function public.cash_game_require_operator(target_club_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_operate_cash_game(target_club_id) then
    raise exception 'Seu papel no clube não permite operar mesas de cash.' using errcode = '42501';
  end if;
end;
$$;

-- Trava a mesa (serializa operações simultâneas), checa papel e exige mesa aberta.
create function public.cash_table_lock_open(target_table_id uuid)
returns public.cash_tables
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cash_tables;
begin
  select * into target from public.cash_tables where id = target_table_id for update;

  if target.id is null then
    raise exception 'Mesa não encontrada.' using errcode = 'P0002';
  end if;
  perform public.cash_game_require_operator(target.club_id);
  if target.status = 'closed' then
    raise exception 'Esta mesa está encerrada.' using errcode = '22023';
  end if;

  return target;
end;
$$;

-- Trava o jogador e confere que é do clube da mesa (e ativo, se pedido).
create function public.cash_table_lock_player(
  target public.cash_tables,
  target_player_id uuid,
  require_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_club uuid;
  is_active boolean;
begin
  select club_id, active into player_club, is_active
  from public.players
  where id = target_player_id
  for update;

  if player_club is null or player_club <> target.club_id then
    raise exception 'Jogador não encontrado.' using errcode = 'P0002';
  end if;
  if require_active and not is_active then
    raise exception 'Jogador inativo. Reative o cadastro para lançar.' using errcode = '22023';
  end if;
end;
$$;

create function public.cash_table_require_seated(target_table_id uuid, target_player_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.cash_table_seats
    where table_id = target_table_id and player_id = target_player_id and left_at is null
  ) then
    raise exception 'O jogador não está sentado nesta mesa.' using errcode = '22023';
  end if;
end;
$$;

create function public.cash_table_chips(target_table_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.chips_cents from public.cash_table_summary(target_table_id) s), 0);
$$;

revoke execute on function
  public.ledger_insert_game_entry(uuid, uuid, public.ledger_entry_kind, bigint, boolean, uuid, text, uuid, uuid),
  public.cash_game_require_operator(uuid),
  public.cash_table_lock_open(uuid),
  public.cash_table_lock_player(public.cash_tables, uuid, boolean),
  public.cash_table_require_seated(uuid, uuid),
  public.cash_table_chips(uuid)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ledger: lançamentos de mesa só pela tela da mesa
-- ---------------------------------------------------------------------------

create or replace function public.record_entry(
  target_player_id uuid,
  entry_kind public.ledger_entry_kind,
  amount_cents bigint,
  paid_upfront boolean default false,
  method_id uuid default null,
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
begin
  if entry_kind not in ('buy_in', 'tournament_entry', 'bar_charge') then
    raise exception 'Tipo de lançamento inválido para entrada.' using errcode = '22023';
  end if;
  if entry_kind = 'bar_charge' and paid_upfront then
    raise exception 'Comanda paga na hora não entra na conta do jogador.' using errcode = '22023';
  end if;
  if target_table_id is not null then
    raise exception 'Compras de mesa de cash são lançadas pela tela da mesa.' using errcode = '22023';
  end if;

  target_club_id := public.ledger_lock_player(target_player_id, true);

  return public.ledger_insert_game_entry(
    target_club_id, target_player_id, entry_kind, amount_cents, paid_upfront, method_id,
    entry_note, null, target_tournament_id
  );
end;
$$;

create or replace function public.record_cash_out(
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
begin
  if target_table_id is not null then
    raise exception 'Devoluções de mesa de cash são lançadas pela tela da mesa.' using errcode = '22023';
  end if;

  target_club_id := public.ledger_lock_player(target_player_id, true);

  return public.ledger_insert_game_entry(
    target_club_id, target_player_id, 'cash_out', amount_cents, false, null, entry_note, null, null
  );
end;
$$;

-- Estorno: igual à Fase 6, mais as regras da mesa (aberta; fichas não ficam negativas).
create or replace function public.reverse_entry(target_entry_id uuid, entry_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  original public.ledger_entries;
  session_status public.player_session_status;
  table_status public.cash_table_status;
  cash_session uuid;
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

  if original.table_id is not null then
    select status into table_status
    from public.cash_tables
    where id = original.table_id
    for update;
    if table_status = 'closed' then
      raise exception 'A mesa deste lançamento está encerrada.' using errcode = '22023';
    end if;
    if original.kind = 'buy_in'
       and public.cash_table_chips(original.table_id) - original.amount_cents < 0 then
      raise exception 'Estornar esta compra deixaria a mesa com fichas negativas. Estorne a devolução antes.'
        using errcode = '22023';
    end if;
  end if;

  -- Dinheiro devolvido sai do caixa aberto agora (não do caixa do lançamento original).
  if original.cash_flow_cents <> 0 then
    cash_session := public.cash_require_open_session(original.club_id);
  end if;

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, payment_method, payment_method_id,
    effect_cents, cash_flow_cents, cash_session_id, reverses_id, note, table_id, tournament_id
  ) values (
    original.club_id, original.player_id, original.session_id, 'reversal', original.amount_cents,
    original.payment_method, original.payment_method_id,
    public.ledger_effect('reversal', original.amount_cents, false, original.effect_cents),
    public.ledger_cash_flow('reversal', original.amount_cents, false, original.cash_flow_cents),
    cash_session, original.id, nullif(btrim(entry_note), ''),
    original.table_id, original.tournament_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Excluir jogador: também recusa quem já sentou em mesa.
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

  if exists (select 1 from public.ledger_entries where player_id = target_player_id)
     or exists (select 1 from public.cash_table_seats where player_id = target_player_id) then
    raise exception 'Jogador com lançamentos não pode ser excluído. Use Inativar.'
      using errcode = '23503';
  end if;

  delete from public.player_sessions where player_id = target_player_id;
  delete from public.players where id = target_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs da mesa
-- ---------------------------------------------------------------------------

create function public.open_cash_table(
  target_club_id uuid,
  table_name text,
  small_blind_cents bigint,
  big_blind_cents bigint,
  max_players smallint default null,
  table_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform public.cash_game_require_operator(target_club_id);

  if char_length(btrim(coalesce(table_name, ''))) < 2 then
    raise exception 'Informe o nome da mesa.' using errcode = '22023';
  end if;
  if coalesce(small_blind_cents, 0) <= 0 or coalesce(big_blind_cents, 0) <= 0 then
    raise exception 'Informe os blinds (maiores que zero).' using errcode = '22023';
  end if;
  if small_blind_cents > big_blind_cents then
    raise exception 'O small blind não pode ser maior que o big blind.' using errcode = '22023';
  end if;
  if max_players is not null and (max_players < 2 or max_players > 12) then
    raise exception 'O limite de jogadores deve ficar entre 2 e 12.' using errcode = '22023';
  end if;

  begin
    insert into public.cash_tables (club_id, name, small_blind_cents, big_blind_cents, max_players, note)
    values (
      target_club_id, btrim(table_name), small_blind_cents, big_blind_cents, max_players,
      nullif(btrim(table_note), '')
    )
    returning id into new_id;
  exception when unique_violation then
    raise exception 'Já existe uma mesa aberta com este nome.' using errcode = '23505';
  end;

  return new_id;
end;
$$;

-- Senta o jogador e, se informado, lança a primeira compra (tudo na mesma transação).
create function public.seat_player(
  target_table_id uuid,
  target_player_id uuid,
  buy_in_cents bigint default null,
  paid_upfront boolean default false,
  method_id uuid default null,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cash_tables;
  other_table text;
  seat uuid;
begin
  target := public.cash_table_lock_open(target_table_id);
  perform public.cash_table_lock_player(target, target_player_id, true);

  select t.name into other_table
  from public.cash_table_seats s
  join public.cash_tables t on t.id = s.table_id
  where s.player_id = target_player_id and s.left_at is null;

  if other_table is not null then
    if exists (
      select 1 from public.cash_table_seats
      where player_id = target_player_id and table_id = target.id and left_at is null
    ) then
      raise exception 'O jogador já está sentado nesta mesa.' using errcode = '22023';
    end if;
    raise exception 'O jogador já está sentado na mesa "%".', other_table using errcode = '22023';
  end if;

  if target.max_players is not null and (
    select count(*) from public.cash_table_seats where table_id = target.id and left_at is null
  ) >= target.max_players then
    raise exception 'A mesa está cheia (% jogadores).', target.max_players using errcode = '22023';
  end if;

  insert into public.cash_table_seats (club_id, table_id, player_id)
  values (target.club_id, target.id, target_player_id)
  returning id into seat;

  if buy_in_cents is not null then
    perform public.ledger_insert_game_entry(
      target.club_id, target_player_id, 'buy_in', buy_in_cents, paid_upfront, method_id,
      entry_note, target.id, null
    );
  end if;

  return seat;
end;
$$;

-- Compra de fichas de quem está sentado.
create function public.table_buy_in(
  target_table_id uuid,
  target_player_id uuid,
  amount_cents bigint,
  paid_upfront boolean default false,
  method_id uuid default null,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cash_tables;
begin
  target := public.cash_table_lock_open(target_table_id);
  perform public.cash_table_lock_player(target, target_player_id, true);
  perform public.cash_table_require_seated(target.id, target_player_id);

  return public.ledger_insert_game_entry(
    target.club_id, target_player_id, 'buy_in', amount_cents, paid_upfront, method_id,
    entry_note, target.id, null
  );
end;
$$;

-- Devolução de fichas (saída). Opcionalmente o jogador levanta da mesa.
create function public.table_cash_out(
  target_table_id uuid,
  target_player_id uuid,
  amount_cents bigint,
  leave_table boolean default false,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cash_tables;
  new_id uuid;
begin
  target := public.cash_table_lock_open(target_table_id);
  -- Jogador inativado durante o jogo ainda pode devolver as fichas.
  perform public.cash_table_lock_player(target, target_player_id, false);
  perform public.cash_table_require_seated(target.id, target_player_id);

  if amount_cents is not null and amount_cents > public.cash_table_chips(target.id) then
    raise exception 'A devolução passa das fichas que estão na mesa.' using errcode = '22023';
  end if;

  new_id := public.ledger_insert_game_entry(
    target.club_id, target_player_id, 'cash_out', amount_cents, false, null, entry_note, target.id, null
  );

  if coalesce(leave_table, false) then
    update public.cash_table_seats
       set left_at = now(), left_by = auth.uid()
     where table_id = target.id and player_id = target_player_id and left_at is null;
  end if;

  return new_id;
end;
$$;

-- Levantar sem devolver fichas (ex.: jogador quebrou).
create function public.unseat_player(target_seat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  seat public.cash_table_seats;
begin
  select * into seat from public.cash_table_seats where id = target_seat_id;

  if seat.id is null then
    raise exception 'Jogador não encontrado na mesa.' using errcode = 'P0002';
  end if;

  perform public.cash_table_lock_open(seat.table_id);

  update public.cash_table_seats
     set left_at = now(), left_by = auth.uid()
   where id = seat.id and left_at is null;

  if not found then
    raise exception 'O jogador já levantou desta mesa.' using errcode = '22023';
  end if;
end;
$$;

-- Rake, capilé ou despesa da mesa.
create function public.record_table_entry(
  target_table_id uuid,
  entry_kind public.cash_table_entry_kind,
  amount_cents bigint,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cash_tables;
  new_id uuid;
begin
  target := public.cash_table_lock_open(target_table_id);

  if amount_cents is null or amount_cents <= 0 then
    raise exception 'Informe um valor maior que zero.' using errcode = '22023';
  end if;
  if entry_kind in ('rake', 'tip') and amount_cents > public.cash_table_chips(target.id) then
    raise exception 'O valor passa das fichas que estão na mesa.' using errcode = '22023';
  end if;

  insert into public.cash_table_entries (club_id, table_id, kind, amount_cents, note)
  values (target.club_id, target.id, entry_kind, amount_cents, nullif(btrim(entry_note), ''))
  returning id into new_id;

  return new_id;
end;
$$;

create function public.reverse_table_entry(target_entry_id uuid, entry_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  original public.cash_table_entries;
  new_id uuid;
begin
  select * into original from public.cash_table_entries where id = target_entry_id;

  if original.id is null then
    raise exception 'Lançamento não encontrado.' using errcode = 'P0002';
  end if;

  perform public.cash_table_lock_open(original.table_id);

  if original.reverses_id is not null then
    raise exception 'Um estorno não pode ser estornado.' using errcode = '22023';
  end if;
  if exists (select 1 from public.cash_table_entries where reverses_id = original.id) then
    raise exception 'Este lançamento já foi estornado.' using errcode = '22023';
  end if;

  insert into public.cash_table_entries (club_id, table_id, kind, amount_cents, reverses_id, note)
  values (
    original.club_id, original.table_id, original.kind, original.amount_cents, original.id,
    nullif(btrim(entry_note), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Encerrar: só com fichas zeradas e ninguém sentado. Mesa encerrada não reabre.
create function public.close_cash_table(target_table_id uuid, closing_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cash_tables;
  summary record;
begin
  target := public.cash_table_lock_open(target_table_id);

  select * into summary from public.cash_table_summary(target.id);

  if summary.seated_count > 0 then
    raise exception 'Ainda há jogadores sentados. Levante todos antes de encerrar.'
      using errcode = '22023';
  end if;
  if summary.chips_cents <> 0 then
    raise exception 'A conferência não fecha: as fichas na mesa precisam estar zeradas para encerrar.'
      using errcode = '22023';
  end if;

  update public.cash_tables
     set status = 'closed',
         closed_at = now(),
         closed_by = auth.uid(),
         closing_note = nullif(btrim(close_cash_table.closing_note), '')
   where id = target.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões das RPCs
-- ---------------------------------------------------------------------------

revoke execute on function
  public.open_cash_table(uuid, text, bigint, bigint, smallint, text),
  public.seat_player(uuid, uuid, bigint, boolean, uuid, text),
  public.table_buy_in(uuid, uuid, bigint, boolean, uuid, text),
  public.table_cash_out(uuid, uuid, bigint, boolean, text),
  public.unseat_player(uuid),
  public.record_table_entry(uuid, public.cash_table_entry_kind, bigint, text),
  public.reverse_table_entry(uuid, text),
  public.close_cash_table(uuid, text)
from public, anon;

grant execute on function
  public.open_cash_table(uuid, text, bigint, bigint, smallint, text),
  public.seat_player(uuid, uuid, bigint, boolean, uuid, text),
  public.table_buy_in(uuid, uuid, bigint, boolean, uuid, text),
  public.table_cash_out(uuid, uuid, bigint, boolean, text),
  public.unseat_player(uuid),
  public.record_table_entry(uuid, public.cash_table_entry_kind, bigint, text),
  public.reverse_table_entry(uuid, text),
  public.close_cash_table(uuid, text)
to authenticated;
