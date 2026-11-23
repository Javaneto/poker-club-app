-- Fase 6 — Caixa do Dia e formas de pagamento por clube.
--
-- * payment_methods: cada clube ativa/renomeia formas; cada uma tem um tipo fixo (enum payment_method).
-- * cash_sessions: no máximo um caixa aberto por clube. Fechamento confere só o dinheiro físico.
-- * cash_movements: sangria (withdrawal) e suprimento (deposit). Imutáveis.
-- * ledger_entries ganha payment_method_id, cash_flow_cents (+ entra dinheiro, − sai) e FK do caixa.
--   Lançamentos com dinheiro real ficam no caixa aberto; sem caixa aberto, bloqueia se o clube exigir.

-- ---------------------------------------------------------------------------
-- Formas de pagamento por clube
-- ---------------------------------------------------------------------------

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  kind public.payment_method not null,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payment_methods_club_name_key
  on public.payment_methods (club_id, public.normalize_text(name));
create index payment_methods_club_idx on public.payment_methods (club_id, sort_order);

create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

create trigger payment_methods_audit
  after insert or update or delete on public.payment_methods
  for each row execute function public.audit_row_change();

-- O tipo de uma forma não muda depois de criada (relatórios antigos dependem dele).
create function public.payment_methods_kind_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind <> old.kind or new.club_id <> old.club_id then
    raise exception 'O tipo da forma de pagamento não pode ser alterado.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger payment_methods_kind_immutable
  before update on public.payment_methods
  for each row execute function public.payment_methods_kind_immutable();

create function public.create_default_payment_methods(target_club_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.payment_methods (club_id, kind, name, sort_order) values
    (target_club_id, 'cash', 'Dinheiro', 1),
    (target_club_id, 'pix', 'PIX', 2),
    (target_club_id, 'debit_card', 'Cartão de débito', 3),
    (target_club_id, 'credit_card', 'Cartão de crédito', 4);
$$;

revoke execute on function public.create_default_payment_methods(uuid) from public, anon, authenticated;

create function public.clubs_create_default_payment_methods()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_default_payment_methods(new.id);
  return new;
end;
$$;

create trigger clubs_create_default_payment_methods
  after insert on public.clubs
  for each row execute function public.clubs_create_default_payment_methods();

-- Clubes já existentes recebem as formas padrão.
select public.create_default_payment_methods(c.id) from public.clubs c;

alter table public.payment_methods enable row level security;

create policy payment_methods_select on public.payment_methods
  for select to authenticated using (public.is_club_member(club_id));

create policy payment_methods_insert on public.payment_methods
  for insert to authenticated
  with check (public.has_club_role(club_id, array['owner', 'manager']::public.club_role[]));

create policy payment_methods_update on public.payment_methods
  for update to authenticated
  using (public.has_club_role(club_id, array['owner', 'manager']::public.club_role[]))
  with check (public.has_club_role(club_id, array['owner', 'manager']::public.club_role[]));

-- Sem DELETE: forma em uso fica no histórico; desative em vez de apagar.
revoke delete, truncate on public.payment_methods from authenticated;
revoke all on public.payment_methods from anon;

-- ---------------------------------------------------------------------------
-- Caixa do Dia
-- ---------------------------------------------------------------------------

create type public.cash_session_status as enum ('open', 'closed');
create type public.cash_movement_kind as enum ('withdrawal', 'deposit');

-- Quem opera o caixa (abrir, sangria, suprimento, fechar).
create function public.can_operate_cash(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_club_role(target_club_id, array['owner', 'manager', 'cashier']::public.club_role[]);
$$;

revoke execute on function public.can_operate_cash(uuid) from public, anon;
grant execute on function public.can_operate_cash(uuid) to authenticated;

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  status public.cash_session_status not null default 'open',
  opening_cents bigint not null check (opening_cents >= 0),
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users (id) on delete set null default auth.uid(),
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  -- Congelados no fechamento.
  expected_cash_cents bigint,
  counted_cents bigint check (counted_cents >= 0),
  difference_cents bigint,
  closing_note text check (char_length(closing_note) <= 500),
  constraint cash_sessions_closed_consistency check (
    (status = 'open' and closed_at is null and counted_cents is null)
    or (status = 'closed' and closed_at is not null and counted_cents is not null
        and expected_cash_cents is not null and difference_cents is not null)
  )
);

create unique index cash_sessions_one_open_per_club
  on public.cash_sessions (club_id) where status = 'open';
create index cash_sessions_club_opened_idx on public.cash_sessions (club_id, opened_at desc);

create trigger cash_sessions_audit
  after insert or update or delete on public.cash_sessions
  for each row execute function public.audit_row_change();

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  cash_session_id uuid not null references public.cash_sessions (id) on delete restrict,
  kind public.cash_movement_kind not null,
  amount_cents bigint not null check (amount_cents > 0),
  note text check (char_length(note) <= 500),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index cash_movements_session_idx on public.cash_movements (cash_session_id, created_at);

create trigger cash_movements_audit
  after insert or update or delete on public.cash_movements
  for each row execute function public.audit_row_change();

create trigger cash_movements_no_update_delete
  before update or delete on public.cash_movements
  for each row execute function public.ledger_entries_immutable();

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;

create policy cash_sessions_select on public.cash_sessions
  for select to authenticated using (public.is_club_member(club_id));
create policy cash_movements_select on public.cash_movements
  for select to authenticated using (public.is_club_member(club_id));

revoke insert, update, delete, truncate on public.cash_sessions, public.cash_movements
  from authenticated;
revoke all on public.cash_sessions, public.cash_movements from anon;

alter publication supabase_realtime add table public.cash_sessions, public.cash_movements;

-- ---------------------------------------------------------------------------
-- Lançamentos: forma do clube, fluxo de dinheiro e vínculo com o caixa
-- ---------------------------------------------------------------------------

alter table public.ledger_entries
  add column payment_method_id uuid references public.payment_methods (id) on delete restrict,
  -- + dinheiro entra no clube; − sai do clube; 0 = não envolve dinheiro (fiado, saída de fichas).
  add column cash_flow_cents bigint not null default 0,
  add constraint ledger_entries_cash_session_fkey
    foreign key (cash_session_id) references public.cash_sessions (id) on delete restrict;

create index ledger_entries_cash_session_idx on public.ledger_entries (cash_session_id);

-- Fluxo de dinheiro de um lançamento (espelha features/cash-register/domain).
create function public.ledger_cash_flow(
  entry_kind public.ledger_entry_kind,
  amount bigint,
  paid boolean,
  reversed_flow bigint default null
)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case entry_kind
    when 'buy_in' then case when paid then amount else 0 end
    when 'tournament_entry' then case when paid then amount else 0 end
    when 'payment_in' then amount
    when 'payout' then -amount
    when 'reversal' then 0 - coalesce(reversed_flow, 0)
    else 0
  end;
$$;

-- Valida a forma de pagamento (do clube e ativa) e devolve o tipo.
create function public.cash_resolve_method(target_club_id uuid, method_id uuid)
returns public.payment_method
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  method_kind public.payment_method;
  method_active boolean;
begin
  if method_id is null then
    raise exception 'Informe a forma de pagamento.' using errcode = '22023';
  end if;

  select kind, active into method_kind, method_active
  from public.payment_methods
  where id = method_id and club_id = target_club_id;

  if method_kind is null then
    raise exception 'Forma de pagamento não encontrada.' using errcode = 'P0002';
  end if;
  if not method_active then
    raise exception 'Esta forma de pagamento está desativada.' using errcode = '22023';
  end if;

  return method_kind;
end;
$$;

-- Caixa aberto do clube; se não houver e o clube exigir, bloqueia.
create function public.cash_require_open_session(target_club_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  session uuid;
  required boolean;
begin
  select id into session
  from public.cash_sessions
  where club_id = target_club_id and status = 'open';

  if session is null then
    select require_open_cash_session into required
    from public.club_settings
    where club_id = target_club_id;

    if coalesce(required, true) then
      raise exception 'Abra o caixa antes de receber ou pagar em dinheiro, PIX ou cartão.'
        using errcode = '22023';
    end if;
  end if;

  return session;
end;
$$;

revoke execute on function
  public.cash_resolve_method(uuid, uuid),
  public.cash_require_open_session(uuid)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs de lançamento (substituem as da Fase 5: forma de pagamento agora é do clube)
-- ---------------------------------------------------------------------------

drop function public.record_entry(uuid, public.ledger_entry_kind, bigint, boolean, public.payment_method, text, uuid, uuid);
drop function public.record_payment(uuid, public.ledger_entry_kind, bigint, public.payment_method, text);
drop function public.reverse_entry(uuid, text);

create function public.record_entry(
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
  session uuid;
  method_kind public.payment_method;
  cash_session uuid;
  new_id uuid;
begin
  if entry_kind not in ('buy_in', 'tournament_entry', 'bar_charge') then
    raise exception 'Tipo de lançamento inválido para entrada.' using errcode = '22023';
  end if;
  if entry_kind = 'bar_charge' and paid_upfront then
    raise exception 'Comanda paga na hora não entra na conta do jogador.' using errcode = '22023';
  end if;

  target_club_id := public.ledger_lock_player(target_player_id, true);

  if paid_upfront then
    method_kind := public.cash_resolve_method(target_club_id, method_id);
    cash_session := public.cash_require_open_session(target_club_id);
  end if;

  session := public.ledger_open_session_id(target_player_id, true);

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, paid_upfront, payment_method,
    payment_method_id, effect_cents, cash_flow_cents, cash_session_id, note, table_id, tournament_id
  ) values (
    target_club_id, target_player_id, session, entry_kind, amount_cents, paid_upfront, method_kind,
    case when paid_upfront then method_id end,
    public.ledger_effect(entry_kind, amount_cents, paid_upfront),
    public.ledger_cash_flow(entry_kind, amount_cents, paid_upfront),
    cash_session, nullif(btrim(entry_note), ''), target_table_id, target_tournament_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

create function public.record_payment(
  target_player_id uuid,
  entry_kind public.ledger_entry_kind,
  amount_cents bigint,
  method_id uuid,
  entry_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club_id uuid;
  method_kind public.payment_method;
  cash_session uuid;
  new_id uuid;
begin
  if entry_kind not in ('payment_in', 'payout') then
    raise exception 'Tipo de pagamento inválido.' using errcode = '22023';
  end if;

  target_club_id := public.ledger_lock_player(target_player_id, false);
  method_kind := public.cash_resolve_method(target_club_id, method_id);
  cash_session := public.cash_require_open_session(target_club_id);

  insert into public.ledger_entries (
    club_id, player_id, session_id, kind, amount_cents, payment_method, payment_method_id,
    effect_cents, cash_flow_cents, cash_session_id, note
  ) values (
    target_club_id, target_player_id,
    public.ledger_open_session_id(target_player_id, false),
    entry_kind, amount_cents, method_kind, method_id,
    public.ledger_effect(entry_kind, amount_cents, false),
    public.ledger_cash_flow(entry_kind, amount_cents, false),
    cash_session, nullif(btrim(entry_note), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create function public.reverse_entry(target_entry_id uuid, entry_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  original public.ledger_entries;
  session_status public.player_session_status;
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

-- ---------------------------------------------------------------------------
-- Resumo do caixa
-- ---------------------------------------------------------------------------

create function public.cash_session_summary(target_session_id uuid)
returns table (
  opening_cents bigint,
  cash_in_cents bigint,
  cash_out_cents bigint,
  deposits_cents bigint,
  withdrawals_cents bigint,
  expected_cash_cents bigint,
  by_method jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with session as (
    select s.id, s.opening_cents from public.cash_sessions s where s.id = target_session_id
  ),
  entries as (
    select e.payment_method, e.payment_method_id, e.cash_flow_cents
    from public.ledger_entries e
    where e.cash_session_id = target_session_id and e.cash_flow_cents <> 0
  ),
  cash as (
    select
      coalesce(sum(cash_flow_cents) filter (where payment_method = 'cash' and cash_flow_cents > 0), 0) as cash_in,
      coalesce(-sum(cash_flow_cents) filter (where payment_method = 'cash' and cash_flow_cents < 0), 0) as cash_out
    from entries
  ),
  moves as (
    select
      coalesce(sum(m.amount_cents) filter (where m.kind = 'deposit'), 0) as deposits,
      coalesce(sum(m.amount_cents) filter (where m.kind = 'withdrawal'), 0) as withdrawals
    from public.cash_movements m
    where m.cash_session_id = target_session_id
  ),
  per_method as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'payment_method_id', x.payment_method_id,
      'name', x.name,
      'kind', x.kind,
      'in_cents', x.in_cents,
      'out_cents', x.out_cents
    ) order by x.sort_order, x.name), '[]'::jsonb) as data
    from (
      select
        e.payment_method_id,
        coalesce(pm.name, e.payment_method::text) as name,
        e.payment_method as kind,
        coalesce(pm.sort_order, 99) as sort_order,
        coalesce(sum(e.cash_flow_cents) filter (where e.cash_flow_cents > 0), 0) as in_cents,
        coalesce(-sum(e.cash_flow_cents) filter (where e.cash_flow_cents < 0), 0) as out_cents
      from entries e
      left join public.payment_methods pm on pm.id = e.payment_method_id
      group by e.payment_method_id, pm.name, e.payment_method, pm.sort_order
    ) x
  )
  select
    s.opening_cents,
    c.cash_in::bigint,
    c.cash_out::bigint,
    m.deposits::bigint,
    m.withdrawals::bigint,
    (s.opening_cents + c.cash_in - c.cash_out + m.deposits - m.withdrawals)::bigint,
    p.data
  from session s, cash c, moves m, per_method p;
$$;

grant execute on function public.cash_session_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs do caixa
-- ---------------------------------------------------------------------------

create function public.cash_require_operator(target_club_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_operate_cash(target_club_id) then
    raise exception 'Seu papel no clube não permite operar o caixa.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.cash_require_operator(uuid) from public, anon, authenticated;

create function public.open_cash_session(target_club_id uuid, opening_cents bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform public.cash_require_operator(target_club_id);

  if opening_cents is null or opening_cents < 0 then
    raise exception 'Informe o valor de abertura (pode ser zero).' using errcode = '22023';
  end if;

  -- Serializa aberturas simultâneas do mesmo clube.
  perform 1 from public.clubs where id = target_club_id for update;

  if exists (select 1 from public.cash_sessions where club_id = target_club_id and status = 'open') then
    raise exception 'Já existe um caixa aberto neste clube.' using errcode = '22023';
  end if;

  insert into public.cash_sessions (club_id, opening_cents)
  values (target_club_id, opening_cents)
  returning id into new_id;

  return new_id;
end;
$$;

create function public.cash_register_movement(
  target_session_id uuid,
  movement_kind public.cash_movement_kind,
  amount_cents bigint,
  movement_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  session public.cash_sessions;
  new_id uuid;
begin
  select * into session from public.cash_sessions where id = target_session_id for update;

  if session.id is null then
    raise exception 'Caixa não encontrado.' using errcode = 'P0002';
  end if;
  perform public.cash_require_operator(session.club_id);
  if session.status = 'closed' then
    raise exception 'Este caixa já foi fechado.' using errcode = '22023';
  end if;

  insert into public.cash_movements (club_id, cash_session_id, kind, amount_cents, note)
  values (session.club_id, session.id, movement_kind, amount_cents, nullif(btrim(movement_note), ''))
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.cash_register_movement(uuid, public.cash_movement_kind, bigint, text)
  from public, anon, authenticated;

-- Sangria: retirada de dinheiro da gaveta.
create function public.withdraw(target_session_id uuid, amount_cents bigint, movement_note text default null)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.cash_register_movement(target_session_id, 'withdrawal', amount_cents, movement_note);
$$;

-- Suprimento: reforço de dinheiro na gaveta.
create function public.deposit(target_session_id uuid, amount_cents bigint, movement_note text default null)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.cash_register_movement(target_session_id, 'deposit', amount_cents, movement_note);
$$;

-- Fecha com o valor contado (só dinheiro físico). Devolve a diferença (contado − esperado).
create function public.close_cash_session(
  target_session_id uuid,
  counted_cents bigint,
  note text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  session public.cash_sessions;
  expected bigint;
begin
  select * into session from public.cash_sessions where id = target_session_id for update;

  if session.id is null then
    raise exception 'Caixa não encontrado.' using errcode = 'P0002';
  end if;
  perform public.cash_require_operator(session.club_id);
  if session.status = 'closed' then
    raise exception 'Este caixa já foi fechado.' using errcode = '22023';
  end if;
  if counted_cents is null or counted_cents < 0 then
    raise exception 'Informe o valor contado em dinheiro.' using errcode = '22023';
  end if;

  select s.expected_cash_cents into expected from public.cash_session_summary(session.id) s;

  update public.cash_sessions
     set status = 'closed',
         closed_at = now(),
         closed_by = auth.uid(),
         expected_cash_cents = expected,
         counted_cents = close_cash_session.counted_cents,
         difference_cents = close_cash_session.counted_cents - expected,
         closing_note = nullif(btrim(note), '')
   where id = session.id;

  return counted_cents - expected;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões das RPCs
-- ---------------------------------------------------------------------------

revoke execute on function
  public.record_entry(uuid, public.ledger_entry_kind, bigint, boolean, uuid, text, uuid, uuid),
  public.record_payment(uuid, public.ledger_entry_kind, bigint, uuid, text),
  public.reverse_entry(uuid, text),
  public.open_cash_session(uuid, bigint),
  public.withdraw(uuid, bigint, text),
  public.deposit(uuid, bigint, text),
  public.close_cash_session(uuid, bigint, text)
from public, anon;

grant execute on function
  public.record_entry(uuid, public.ledger_entry_kind, bigint, boolean, uuid, text, uuid, uuid),
  public.record_payment(uuid, public.ledger_entry_kind, bigint, uuid, text),
  public.reverse_entry(uuid, text),
  public.open_cash_session(uuid, bigint),
  public.withdraw(uuid, bigint, text),
  public.deposit(uuid, bigint, text),
  public.close_cash_session(uuid, bigint, text)
to authenticated;
