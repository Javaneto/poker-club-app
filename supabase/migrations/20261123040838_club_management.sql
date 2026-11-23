-- Fase 3 — gestão de clubes: criar clube, convites por link, papéis e remoção de membros.
--
-- Escrita em club_members passa a ser só por RPC (regras de vários passos e a garantia
-- de que todo clube mantém ao menos um owner).

-- ---------------------------------------------------------------------------
-- club_members: remove escrita direta; tudo via RPC
-- ---------------------------------------------------------------------------

drop policy club_members_insert on public.club_members;
drop policy club_members_update on public.club_members;
drop policy club_members_delete on public.club_members;

revoke insert, update, delete on public.club_members from authenticated;

-- ---------------------------------------------------------------------------
-- Convites
-- ---------------------------------------------------------------------------

create table public.club_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.club_role not null,
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index club_invitations_pending_email_idx
  on public.club_invitations (club_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.club_invitations enable row level security;

-- Só o owner vê os convites do clube (o token dá acesso, então não vaza para outros papéis).
create policy club_invitations_select on public.club_invitations
  for select to authenticated
  using (public.has_club_role(club_id, array['owner']::public.club_role[]));

revoke insert, update, delete on public.club_invitations from authenticated;
revoke all on public.club_invitations from anon;

create trigger club_invitations_audit
  after insert or update or delete on public.club_invitations
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.require_club_owner(target_club_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_club_role(target_club_id, array['owner']::public.club_role[]) then
    raise exception 'Apenas o dono do clube pode fazer isso.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.require_club_owner(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: criar clube (quem cria vira owner)
-- ---------------------------------------------------------------------------

create function public.create_club(club_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_club_id uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'É preciso estar logado.' using errcode = '42501';
  end if;

  insert into public.clubs (name, created_by)
  values (btrim(club_name), caller)
  returning id into new_club_id;

  insert into public.club_members (club_id, user_id, role)
  values (new_club_id, caller, 'owner');

  return new_club_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: convites
-- ---------------------------------------------------------------------------

create function public.create_club_invitation(
  target_club_id uuid,
  invite_email text,
  invite_role public.club_role
)
returns public.club_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(invite_email));
  result public.club_invitations;
begin
  perform public.require_club_owner(target_club_id);

  if exists (
    select 1
    from public.club_members m
    join auth.users u on u.id = m.user_id
    where m.club_id = target_club_id and lower(u.email) = normalized_email
  ) then
    raise exception 'Essa pessoa já faz parte do clube.' using errcode = '23505';
  end if;

  -- Reenviar convite para o mesmo e-mail substitui o pendente.
  update public.club_invitations
     set revoked_at = now()
   where club_id = target_club_id
     and email = normalized_email
     and accepted_at is null
     and revoked_at is null;

  insert into public.club_invitations (club_id, email, role)
  values (target_club_id, normalized_email, invite_role)
  returning * into result;

  return result;
end;
$$;

create function public.revoke_club_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club_id uuid;
begin
  select club_id into target_club_id
  from public.club_invitations
  where id = invitation_id;

  if target_club_id is null then
    raise exception 'Convite não encontrado.' using errcode = 'P0002';
  end if;

  perform public.require_club_owner(target_club_id);

  update public.club_invitations
     set revoked_at = now()
   where id = invitation_id
     and accepted_at is null
     and revoked_at is null;
end;
$$;

-- Mostra o convite para quem tem o link (antes de aceitar), sem expor outros dados.
create function public.get_invitation_by_token(invite_token uuid)
returns table (
  club_name text,
  email text,
  role public.club_role,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.name,
    i.email,
    i.role,
    case
      when i.accepted_at is not null then 'accepted'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at < now() then 'expired'
      else 'pending'
    end
  from public.club_invitations i
  join public.clubs c on c.id = i.club_id
  where i.token = invite_token;
$$;

create function public.accept_club_invitation(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  caller_email text;
  invitation public.club_invitations;
begin
  if caller is null then
    raise exception 'É preciso estar logado.' using errcode = '42501';
  end if;

  select lower(email) into caller_email from auth.users where id = caller;

  select * into invitation
  from public.club_invitations
  where token = invite_token
  for update;

  if invitation.id is null then
    raise exception 'Convite não encontrado.' using errcode = 'P0002';
  elsif invitation.accepted_at is not null then
    raise exception 'Este convite já foi usado.' using errcode = '22023';
  elsif invitation.revoked_at is not null then
    raise exception 'Este convite foi cancelado.' using errcode = '22023';
  elsif invitation.expires_at < now() then
    raise exception 'Este convite expirou. Peça um novo ao dono do clube.' using errcode = '22023';
  elsif invitation.email <> caller_email then
    raise exception 'Este convite é para outro e-mail (%).', invitation.email using errcode = '42501';
  end if;

  insert into public.club_members (club_id, user_id, role)
  values (invitation.club_id, caller, invitation.role)
  on conflict (club_id, user_id) do nothing;

  update public.club_invitations
     set accepted_at = now(), accepted_by = caller
   where id = invitation.id;

  return invitation.club_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: membros
-- ---------------------------------------------------------------------------

-- Lista a equipe com nome e e-mail (e-mail mora em auth.users, inacessível ao cliente).
create function public.list_club_members(target_club_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.club_role,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_club_member(target_club_id) then
    raise exception 'Você não faz parte deste clube.' using errcode = '42501';
  end if;

  return query
    select m.user_id, coalesce(p.full_name, ''), u.email::text, m.role, m.created_at
    from public.club_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.club_id = target_club_id
    order by m.created_at;
end;
$$;

create function public.update_club_member_role(
  target_club_id uuid,
  target_user_id uuid,
  new_role public.club_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_role public.club_role;
begin
  perform public.require_club_owner(target_club_id);

  select role into member_role
  from public.club_members
  where club_id = target_club_id and user_id = target_user_id
  for update;

  if member_role is null then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  if member_role = 'owner' and new_role <> 'owner' and (
    select count(*) from public.club_members
    where club_id = target_club_id and role = 'owner'
  ) = 1 then
    raise exception 'O clube precisa de pelo menos um dono.' using errcode = '22023';
  end if;

  update public.club_members
     set role = new_role
   where club_id = target_club_id and user_id = target_user_id;
end;
$$;

-- Owner remove qualquer membro; qualquer membro pode sair do clube.
create function public.remove_club_member(target_club_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.club_role;
begin
  if target_user_id <> auth.uid() then
    perform public.require_club_owner(target_club_id);
  end if;

  select role into target_role
  from public.club_members
  where club_id = target_club_id and user_id = target_user_id
  for update;

  if target_role is null then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  if target_role = 'owner' and (
    select count(*) from public.club_members
    where club_id = target_club_id and role = 'owner'
  ) = 1 then
    raise exception 'O clube precisa de pelo menos um dono.' using errcode = '22023';
  end if;

  delete from public.club_members
  where club_id = target_club_id and user_id = target_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões das RPCs
-- ---------------------------------------------------------------------------

revoke execute on function
  public.create_club(text),
  public.create_club_invitation(uuid, text, public.club_role),
  public.revoke_club_invitation(uuid),
  public.get_invitation_by_token(uuid),
  public.accept_club_invitation(uuid),
  public.list_club_members(uuid),
  public.update_club_member_role(uuid, uuid, public.club_role),
  public.remove_club_member(uuid, uuid)
from public, anon;

grant execute on function
  public.create_club(text),
  public.create_club_invitation(uuid, text, public.club_role),
  public.revoke_club_invitation(uuid),
  public.get_invitation_by_token(uuid),
  public.accept_club_invitation(uuid),
  public.list_club_members(uuid),
  public.update_club_member_role(uuid, uuid, public.club_role),
  public.remove_club_member(uuid, uuid)
to authenticated;
