-- Cash game: small blind e big blind passam a ser opcionais na mesa.
-- Quando informados, continuam maiores que zero; "small ≤ big" só vale se os dois existirem.

alter table public.cash_tables
  alter column small_blind_cents drop not null,
  alter column big_blind_cents drop not null;

alter table public.cash_tables drop constraint cash_tables_blinds_order;
alter table public.cash_tables
  add constraint cash_tables_blinds_order check (
    small_blind_cents is null or big_blind_cents is null or small_blind_cents <= big_blind_cents
  );

drop function public.open_cash_table(uuid, text, bigint, bigint, smallint, text);

create function public.open_cash_table(
  target_club_id uuid,
  table_name text,
  small_blind_cents bigint default null,
  big_blind_cents bigint default null,
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
  if small_blind_cents is not null and small_blind_cents <= 0
     or big_blind_cents is not null and big_blind_cents <= 0 then
    raise exception 'Os blinds, quando informados, devem ser maiores que zero.' using errcode = '22023';
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

revoke execute on function public.open_cash_table(uuid, text, bigint, bigint, smallint, text)
  from public, anon;
grant execute on function public.open_cash_table(uuid, text, bigint, bigint, smallint, text)
  to authenticated;
