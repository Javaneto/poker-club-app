-- Fase 4 — jogadores.
--
-- * Nome único no clube sem diferenciar maiúsculas/acentos (normalized_name).
-- * CPF único no clube quando informado. Telefone e CPF guardados só com dígitos.
-- * Busca por nome, apelido, telefone e CPF numa coluna gerada com índice trigram.
-- * Exclusão só por RPC (na Fase 5 passa a checar lançamentos).

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() não é IMMUTABLE; este wrapper fixa o dicionário para poder ser usado em
-- colunas geradas e índices.
create function public.normalize_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, btrim(coalesce(value, ''))));
$$;

-- ---------------------------------------------------------------------------
-- Papéis com acesso
-- ---------------------------------------------------------------------------

-- Quem cadastra/edita jogadores (recepção do clube).
create function public.can_manage_players(target_club_id uuid)
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

revoke execute on function public.can_manage_players(uuid) from public, anon;
grant execute on function public.can_manage_players(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  nickname text check (char_length(nickname) <= 60),
  phone text check (phone ~ '^[0-9]{10,13}$'),
  cpf text check (cpf ~ '^[0-9]{11}$'),
  email text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  birth_date date check (birth_date between date '1900-01-01' and date '2100-01-01'),
  notes text check (char_length(notes) <= 2000),
  active boolean not null default true,
  normalized_name text generated always as (public.normalize_text(full_name)) stored,
  search_text text generated always as (
    public.normalize_text(
      full_name || ' ' || coalesce(nickname, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(cpf, '')
    )
  ) stored,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index players_club_name_key on public.players (club_id, normalized_name);
create unique index players_club_cpf_key on public.players (club_id, cpf) where cpf is not null;
create index players_club_active_name_idx on public.players (club_id, active, normalized_name);
create index players_search_trgm_idx on public.players
  using gin (search_text extensions.gin_trgm_ops);

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

create trigger players_audit
  after insert or update or delete on public.players
  for each row execute function public.audit_row_change();

-- Mensagens amigáveis para nome/CPF repetidos (em vez do erro técnico de índice único).
create function public.players_check_duplicates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.players p
    where p.club_id = new.club_id
      and p.normalized_name = public.normalize_text(new.full_name)
      and p.id <> new.id
  ) then
    raise exception 'Já existe um jogador com esse nome no clube.' using errcode = '23505';
  end if;

  if new.cpf is not null and exists (
    select 1 from public.players p
    where p.club_id = new.club_id and p.cpf = new.cpf and p.id <> new.id
  ) then
    raise exception 'Já existe um jogador com esse CPF no clube.' using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger players_check_duplicates
  before insert or update of full_name, cpf on public.players
  for each row execute function public.players_check_duplicates();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;

create policy players_select on public.players
  for select to authenticated
  using (public.is_club_member(club_id));

create policy players_insert on public.players
  for insert to authenticated
  with check (public.can_manage_players(club_id));

create policy players_update on public.players
  for update to authenticated
  using (public.can_manage_players(club_id))
  with check (public.can_manage_players(club_id));

-- Sem política de DELETE: exclusão só pela RPC delete_player.
revoke delete, truncate on public.players from authenticated;
revoke all on public.players from anon;

-- ---------------------------------------------------------------------------
-- RPC: excluir jogador (dono/gerente). Na Fase 5 recusa quem tem lançamentos.
-- ---------------------------------------------------------------------------

create function public.delete_player(target_player_id uuid)
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

  delete from public.players where id = target_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: aniversariantes dos próximos N dias (no fuso do clube)
-- ---------------------------------------------------------------------------

create function public.upcoming_birthdays(
  target_club_id uuid,
  days_ahead integer default 30,
  reference_date date default null
)
returns table (
  player_id uuid,
  full_name text,
  nickname text,
  birth_date date,
  next_birthday date,
  turning_age integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date;
begin
  if not public.is_club_member(target_club_id) then
    raise exception 'Você não faz parte deste clube.' using errcode = '42501';
  end if;

  select coalesce(reference_date, (now() at time zone s.time_zone)::date)
    into today
    from public.club_settings s
   where s.club_id = target_club_id;

  return query
    with candidates as (
      select
        p.id,
        p.full_name,
        p.nickname,
        p.birth_date,
        -- aniversário neste ano; 29/02 vira 28/02 em ano não bissexto
        (p.birth_date + make_interval(years => extract(year from today)::int - extract(year from p.birth_date)::int))::date
          as this_year
      from public.players p
      where p.club_id = target_club_id
        and p.active
        and p.birth_date is not null
    ),
    next_dates as (
      select
        c.*,
        case
          when c.this_year >= today then c.this_year
          else (c.birth_date + make_interval(years => extract(year from today)::int + 1 - extract(year from c.birth_date)::int))::date
        end as next_date
      from candidates c
    )
    select
      n.id,
      n.full_name,
      n.nickname,
      n.birth_date,
      n.next_date,
      (extract(year from n.next_date) - extract(year from n.birth_date))::integer
    from next_dates n
    where n.next_date <= today + days_ahead
    order by n.next_date, n.full_name;
end;
$$;

revoke execute on function public.delete_player(uuid) from public, anon;
revoke execute on function public.upcoming_birthdays(uuid, integer, date) from public, anon;
grant execute on function public.delete_player(uuid) to authenticated;
grant execute on function public.upcoming_birthdays(uuid, integer, date) to authenticated;
