-- Correções de integridade: exclusão de usuário com lançamentos, imutabilidade preservada,
-- exclusão de clube desligada, regra do último dono e travas de leitura nas RPCs.
-- (As corridas em si precisam de duas conexões; aqui fica o que dá para checar numa só.)
begin;
select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'dono@teste.test'),
  ('22222222-2222-4222-8222-222222222222', 'caixa@teste.test'),
  ('33333333-3333-4333-8333-333333333333', 'dealer@teste.test');

insert into public.clubs (id, name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Clube A');

insert into public.club_members (club_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'cashier'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'dealer');

insert into public.players (id, club_id, full_name) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jogador Um');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids select 'cash', id from public.payment_methods
  where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'cash';

-- ======================= Travas de leitura =======================
select is(
  (select provolatile::text from pg_catalog.pg_proc
    where oid = 'public.cash_require_open_session(uuid)'::regprocedure),
  'v',
  'cash_require_open_session é VOLATILE (usa FOR SHARE no caixa aberto)'
);

select ok(
  pg_catalog.pg_get_functiondef('public.cash_require_open_session(uuid)'::regprocedure) ~* 'for share'
  and pg_catalog.pg_get_functiondef('public.ledger_open_session_id(uuid, boolean)'::regprocedure) ~* 'for share',
  'caixa aberto e sessão aberta são lidos com FOR SHARE'
);

-- ======================= Caixa cria lançamentos =======================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

insert into ids values ('session', public.open_cash_session('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 10000));
insert into ids values ('entry', public.record_entry(
  'a0000000-0000-4000-8000-000000000001', 'buy_in', 5000, true, (select id from ids where name = 'cash')
));
select public.withdraw((select id from ids where name = 'session'), 2000, 'sangria');
insert into ids values ('table', public.open_cash_table('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Mesa 1'));
select public.record_table_entry((select id from ids where name = 'table'), 'expense', 1500, 'lanche');

-- ======================= Exclusão de clube desligada =======================
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  $$ delete from public.clubs where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'nem o dono apaga o clube pela API'
);

-- ======================= Último dono (regressão) =======================
select throws_ok(
  $$ select public.update_club_member_role('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'manager') $$,
  '22023',
  'O clube precisa de pelo menos um dono.',
  'único dono não se rebaixa'
);

select throws_ok(
  $$ select public.remove_club_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111') $$,
  '22023',
  'O clube precisa de pelo menos um dono.',
  'único dono não sai do clube'
);

select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.remove_club_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333') $$,
  'membro comum continua podendo sair do clube'
);

-- ======================= Imutabilidade continua valendo =======================
reset role;

select throws_ok(
  $$ update public.ledger_entries set amount_cents = 1 where id = (select id from ids where name = 'entry') $$,
  '42501',
  'Lançamentos não podem ser alterados nem apagados. Use um estorno.',
  'valor do lançamento continua imutável'
);

select throws_ok(
  $$ update public.ledger_entries set created_by = '11111111-1111-4111-8111-111111111111'
     where id = (select id from ids where name = 'entry') $$,
  '42501',
  'Lançamentos não podem ser alterados nem apagados. Use um estorno.',
  'autor do lançamento não pode ser trocado por outro'
);

select throws_ok(
  $$ update public.ledger_entries set created_by = null, note = 'x'
     where id = (select id from ids where name = 'entry') $$,
  '42501',
  'Lançamentos não podem ser alterados nem apagados. Use um estorno.',
  'limpar o autor junto com outra mudança é barrado'
);

select throws_ok(
  $$ delete from public.ledger_entries where id = (select id from ids where name = 'entry') $$,
  '42501',
  'Lançamentos não podem ser alterados nem apagados. Use um estorno.',
  'lançamento continua sem DELETE'
);

-- ======================= Exclusão do usuário que lançou =======================
select lives_ok(
  $$ delete from auth.users where id = '22222222-2222-4222-8222-222222222222' $$,
  'usuário com lançamentos, sangria e despesa de mesa pode ser excluído'
);

select is(
  (select (created_by is null, amount_cents, effect_cents, cash_flow_cents)::text
     from public.ledger_entries where id = (select id from ids where name = 'entry')),
  '(t,5000,0,5000)',
  'lançamento fica sem autor e com os valores intactos'
);

select is(
  (select count(*)::int from public.cash_movements m
    join public.cash_table_entries t on t.club_id = m.club_id
   where m.club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     and m.created_by is null and t.created_by is null),
  1,
  'sangria e despesa de mesa continuam, sem autor'
);

select ok(
  exists (
    select 1 from public.audit_log
    where table_name = 'ledger_entries' and operation = 'UPDATE'
      and row_id = (select id::text from ids where name = 'entry')
      and new_data -> 'created_by' = 'null'::jsonb
  ),
  'remoção do autor fica registrada no audit_log'
);

select * from finish();
rollback;
