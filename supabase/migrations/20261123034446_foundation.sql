-- Fase 2 — base multi-clube: perfis, clubes, membros com papel, configurações e auditoria.
--
-- Regras:
-- * Toda tabela de negócio tem club_id e RLS filtrando por is_club_member(club_id).
-- * Funções de checagem são SECURITY DEFINER com search_path vazio (evita recursão de RLS
--   e sequestro de search_path).
-- * audit_log é gravado só pelo gatilho; ninguém altera ou apaga linhas do log.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.club_role as enum ('owner', 'manager', 'cashier', 'director', 'dealer');

comment on type public.club_role is
  'owner: dono; manager: gerente; cashier: caixa; director: diretor de torneio; dealer: dealer.';

-- ---------------------------------------------------------------------------
-- Utilitário: updated_at
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfis (1:1 com auth.users; não pertence a um clube)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando um usuário se cadastra.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Clubes e membros
-- ---------------------------------------------------------------------------

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clubs_set_updated_at
  before update on public.clubs
  for each row execute function public.set_updated_at();

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.club_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index club_members_user_id_idx on public.club_members (user_id);

create trigger club_members_set_updated_at
  before update on public.club_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Funções de permissão
-- ---------------------------------------------------------------------------

create function public.is_club_member(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.club_members m
    where m.club_id = target_club_id
      and m.user_id = (select auth.uid())
  );
$$;

create function public.has_club_role(target_club_id uuid, roles public.club_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.club_members m
    where m.club_id = target_club_id
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

revoke execute on function public.is_club_member(uuid) from public, anon;
revoke execute on function public.has_club_role(uuid, public.club_role[]) from public, anon;
grant execute on function public.is_club_member(uuid) to authenticated;
grant execute on function public.has_club_role(uuid, public.club_role[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Configurações do clube (1:1 com clubs, criada automaticamente)
-- ---------------------------------------------------------------------------

create table public.club_settings (
  club_id uuid primary key references public.clubs (id) on delete cascade,
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  time_zone text not null default 'America/Sao_Paulo',
  enabled_entry_types text[] not null default array['buy_in', 'rebuy', 'add_on']
    check (enabled_entry_types <@ array[
      'buy_in', 'buy_in_free', 'rebuy', 'double', 'triple', 'add_on', 'bounty'
    ]),
  receipt_printer_width_mm smallint not null default 80
    check (receipt_printer_width_mm in (58, 80)),
  pix_key text check (char_length(pix_key) <= 77),
  pix_receiver_name text check (char_length(pix_receiver_name) <= 25),
  pix_receiver_city text check (char_length(pix_receiver_city) <= 15),
  require_open_cash_session boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.club_settings.require_open_cash_session is
  'Bloqueia lançamentos com dinheiro real quando não há caixa aberto (Fase 6).';

create function public.validate_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'Fuso horário inválido: %', new.time_zone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger club_settings_validate_time_zone
  before insert or update of time_zone on public.club_settings
  for each row execute function public.validate_time_zone();

create trigger club_settings_set_updated_at
  before update on public.club_settings
  for each row execute function public.set_updated_at();

create function public.create_default_club_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.club_settings (club_id) values (new.id);
  return new;
end;
$$;

create trigger clubs_create_default_settings
  after insert on public.clubs
  for each row execute function public.create_default_club_settings();

-- ---------------------------------------------------------------------------
-- Auditoria genérica
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  club_id uuid references public.clubs (id) on delete cascade,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  row_id text,
  old_data jsonb,
  new_data jsonb,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index audit_log_club_created_idx on public.audit_log (club_id, created_at desc);
create index audit_log_table_row_idx on public.audit_log (table_name, row_id);

comment on table public.audit_log is
  'Gravado só pelo gatilho audit_row_change(). Sem UPDATE/DELETE para nenhum papel.';

-- Gatilho genérico. club_id vem da coluna club_id da linha; para a própria tabela
-- clubs, do id. row_id é o id da linha (ou a chave composta em JSON).
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  current_row jsonb := coalesce(new_row, old_row);
  target_club_id uuid;
  target_row_id text;
begin
  if tg_op = 'UPDATE' and old_row = new_row then
    return null;
  end if;

  if tg_table_name = 'clubs' then
    target_club_id := (current_row ->> 'id')::uuid;
  else
    target_club_id := (current_row ->> 'club_id')::uuid;
  end if;

  target_row_id := coalesce(
    current_row ->> 'id',
    (select jsonb_object_agg(key, value)::text
       from jsonb_each(current_row)
      where key in ('club_id', 'user_id'))
  );

  insert into public.audit_log (club_id, table_name, operation, row_id, old_data, new_data)
  values (
    -- o clube apagado não existe mais; o log fica sem vínculo em vez de falhar
    case when tg_op = 'DELETE' and tg_table_name = 'clubs' then null else target_club_id end,
    tg_table_name,
    tg_op,
    target_row_id,
    old_row,
    new_row
  );
  return null;
end;
$$;

create trigger clubs_audit
  after insert or update or delete on public.clubs
  for each row execute function public.audit_row_change();

create trigger club_members_audit
  after insert or update or delete on public.club_members
  for each row execute function public.audit_row_change();

create trigger club_settings_audit
  after insert or update or delete on public.club_settings
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_settings enable row level security;
alter table public.audit_log enable row level security;

-- profiles: o próprio usuário e quem divide algum clube com ele.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.club_members theirs
      where theirs.user_id = profiles.id
        and public.is_club_member(theirs.club_id)
    )
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- clubs: membros leem; owner/manager editam. Criação de clube é pela RPC da Fase 3.
create policy clubs_select on public.clubs
  for select to authenticated
  using (public.is_club_member(id));

create policy clubs_update on public.clubs
  for update to authenticated
  using (public.has_club_role(id, array['owner', 'manager']::public.club_role[]))
  with check (public.has_club_role(id, array['owner', 'manager']::public.club_role[]));

create policy clubs_delete on public.clubs
  for delete to authenticated
  using (public.has_club_role(id, array['owner']::public.club_role[]));

-- club_members: membros veem a equipe; só o owner gerencia.
create policy club_members_select on public.club_members
  for select to authenticated
  using (public.is_club_member(club_id));

create policy club_members_insert on public.club_members
  for insert to authenticated
  with check (public.has_club_role(club_id, array['owner']::public.club_role[]));

create policy club_members_update on public.club_members
  for update to authenticated
  using (public.has_club_role(club_id, array['owner']::public.club_role[]))
  with check (public.has_club_role(club_id, array['owner']::public.club_role[]));

create policy club_members_delete on public.club_members
  for delete to authenticated
  using (public.has_club_role(club_id, array['owner']::public.club_role[]));

-- club_settings: membros leem; owner/manager editam (linha criada pelo gatilho).
create policy club_settings_select on public.club_settings
  for select to authenticated
  using (public.is_club_member(club_id));

create policy club_settings_update on public.club_settings
  for update to authenticated
  using (public.has_club_role(club_id, array['owner', 'manager']::public.club_role[]))
  with check (public.has_club_role(club_id, array['owner', 'manager']::public.club_role[]));

-- audit_log: só owner/manager leem; nenhuma política de escrita.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.has_club_role(club_id, array['owner', 'manager']::public.club_role[]));

-- Defesa extra: mesmo um futuro GRANT errado não permite reescrever o log.
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
revoke all on public.profiles, public.clubs, public.club_members, public.club_settings
  from anon;
