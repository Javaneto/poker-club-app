-- Correções de integridade (análise de 23/11/2026).
--
-- 1. Corrida "lançamento x fechamento": quem lança passa a travar (FOR SHARE) o caixa aberto e a
--    sessão aberta do jogador. Se um fechamento estiver em andamento (FOR UPDATE), o lançamento
--    espera e, depois do commit, relê a linha: como ela já está fechada, não entra mais nela.
--    No sentido inverso, o fechamento espera os lançamentos em andamento e os inclui no total.
-- 2. Corrida "último dono": trocar papel e remover membro serializam pela linha do clube
--    (FOR NO KEY UPDATE, que não bloqueia os INSERTs das tabelas filhas).
-- 3. Exclusão de usuário: o ON DELETE SET NULL de created_by em tabelas imutáveis era barrado
--    pelo gatilho de imutabilidade. Agora só essa mudança (created_by → null) é permitida;
--    valores continuam imutáveis e a mudança fica no audit_log.
-- 4. Exclusão de clube: a cascata apagaria lançamentos imutáveis, então nunca funcionava depois do
--    primeiro lançamento. Sai a política de DELETE até existir uma regra de encerramento de clube.

-- ---------------------------------------------------------------------------
-- 1a. Caixa aberto travado para leitura (deixa de ser STABLE: usa FOR SHARE)
-- ---------------------------------------------------------------------------

create or replace function public.cash_require_open_session(target_club_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  session uuid;
  required boolean;
begin
  select id into session
  from public.cash_sessions
  where club_id = target_club_id and status = 'open'
  for share;

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

-- ---------------------------------------------------------------------------
-- 1b. Sessão aberta do jogador travada para leitura
-- ---------------------------------------------------------------------------

create or replace function public.ledger_open_session_id(target_player_id uuid, create_if_missing boolean)
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
  where player_id = target_player_id and status = 'open'
  for share;

  if session is null and create_if_missing then
    select club_id into target_club_id from public.players where id = target_player_id;
    insert into public.player_sessions (club_id, player_id)
    values (target_club_id, target_player_id)
    returning id into session;
  end if;

  return session;
end;
$$;

-- "Finalizar todos": trava em ordem fixa (evita deadlock entre duas chamadas simultâneas).
create or replace function public.close_all_sessions(target_club_id uuid)
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
    order by id
    for update
  loop
    perform public.close_session_internal(session_id);
    closed := closed + 1;
  end loop;

  return closed;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Último dono: serializa mudanças de equipe pelo clube
-- ---------------------------------------------------------------------------

create or replace function public.update_club_member_role(
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

  -- Duas trocas simultâneas não podem ver "2 donos" ao mesmo tempo.
  perform 1 from public.clubs where id = target_club_id for no key update;

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

create or replace function public.remove_club_member(target_club_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.club_role;
begin
  if target_user_id is distinct from auth.uid() then
    perform public.require_club_owner(target_club_id);
  end if;

  perform 1 from public.clubs where id = target_club_id for no key update;

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
-- 3. Imutabilidade: permite só o SET NULL de created_by (exclusão do usuário)
-- ---------------------------------------------------------------------------

-- Usado por ledger_entries, cash_movements e cash_table_entries.
create or replace function public.ledger_entries_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and old.created_by is not null
     and new.created_by is null
     and (to_jsonb(new) - 'created_by') = (to_jsonb(old) - 'created_by') then
    return new;
  end if;

  raise exception 'Lançamentos não podem ser alterados nem apagados. Use um estorno.'
    using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Exclusão de clube desligada
-- ---------------------------------------------------------------------------

drop policy clubs_delete on public.clubs;
revoke delete, truncate on public.clubs from authenticated;
