-- Cash game: abrir mesa, sentar, compras/devoluções no ledger, rake/capilé/despesa, conferência e encerramento.
begin;
select plan(28);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'dono@teste.test'),
  ('22222222-2222-4222-8222-222222222222', 'dealer@teste.test'),
  ('33333333-3333-4333-8333-333333333333', 'garcom@teste.test'),
  ('44444444-4444-4444-8444-444444444444', 'outro@teste.test');

insert into public.clubs (id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Clube A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Clube B');

insert into public.club_members (club_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'dealer'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'waiter'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-444444444444', 'owner');

insert into public.players (id, club_id, full_name) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jogador Um'),
  ('a0000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jogador Dois'),
  ('a0000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jogador Três'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Jogador B');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids select 'cash', id from public.payment_methods where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'cash';

set local role authenticated;

-- ======================= Garçom (não opera mesa) =======================
select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.open_cash_table('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Mesa 1', 100, 200) $$,
  '42501',
  'Seu papel no clube não permite operar mesas de cash.',
  'garçom não abre mesa'
);

-- ======================= Dealer =======================
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.open_cash_table('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Mesa 1', 300, 200) $$,
  '22023',
  'O small blind não pode ser maior que o big blind.',
  'blinds validados'
);

insert into ids values ('t1', public.open_cash_table('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Mesa 1', 100, 200, 2::smallint));

select throws_ok(
  $$ select public.open_cash_table('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ' mesa 1 ', 100, 200) $$,
  '23505',
  'Já existe uma mesa aberta com este nome.',
  'nome único entre mesas abertas'
);

insert into ids values ('t2', public.open_cash_table('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Mesa 2', 200, 500));

select throws_ok(
  $$ select public.table_buy_in((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000001', 10000) $$,
  '22023',
  'O jogador não está sentado nesta mesa.',
  'compra exige jogador sentado'
);

select throws_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 10000, false, null, null, (select id from ids where name = 't1')) $$,
  '22023',
  'Compras de mesa de cash são lançadas pela tela da mesa.',
  'compra de mesa só pela tela da mesa'
);

-- Sentar com compra fiada de R$ 100; sentar o 2º com compra de R$ 200 em dinheiro (sem caixa aberto: bloqueia tudo).
insert into ids values ('seat1', public.seat_player((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000001', 10000));

select throws_ok(
  $$ select public.seat_player((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000002', 20000, true, (select id from ids where name = 'cash')) $$,
  '22023',
  'Abra o caixa antes de receber ou pagar em dinheiro, PIX ou cartão.',
  'compra paga sem caixa aberto bloqueia'
);

select is(
  (select count(*)::int from public.cash_table_seats where player_id = 'a0000000-0000-4000-8000-000000000002'),
  0,
  'sentar + compra é transacional (falhou a compra, não sentou)'
);

select public.seat_player((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000002', 20000);

select throws_ok(
  $$ select public.seat_player((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000003') $$,
  '22023',
  'A mesa está cheia (2 jogadores).',
  'limite de jogadores'
);

select throws_ok(
  $$ select public.seat_player((select id from ids where name = 't2'), 'a0000000-0000-4000-8000-000000000001') $$,
  '22023',
  'O jogador já está sentado na mesa "Mesa 1".',
  'jogador em uma mesa por vez'
);

select throws_ok(
  $$ select public.seat_player((select id from ids where name = 't1'), 'b0000000-0000-4000-8000-000000000001') $$,
  'P0002',
  'Jogador não encontrado.',
  'jogador de outro clube não senta'
);

select is(
  (select kind::text || ':' || effect_cents from public.ledger_entries
    where player_id = 'a0000000-0000-4000-8000-000000000001' and table_id = (select id from ids where name = 't1')),
  'buy_in:-10000',
  'compra da mesa vai para o ledger com table_id (fiado = −valor)'
);

-- Rebuy R$ 50 do jogador 1; rake R$ 15; capilé R$ 5; despesa R$ 30.
select public.table_buy_in((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000001', 5000);
insert into ids values ('rake', public.record_table_entry((select id from ids where name = 't1'), 'rake', 1500, 'Pote'));
select public.record_table_entry((select id from ids where name = 't1'), 'tip', 500);
select public.record_table_entry((select id from ids where name = 't1'), 'expense', 3000, 'Lanche');

select results_eq(
  format($$ select purchases_cents, returns_cents, rake_cents, tips_cents, expenses_cents, chips_cents, seated_count
            from public.cash_table_summary(%L) $$, (select id from ids where name = 't1')),
  $$ values (35000::bigint, 0::bigint, 1500::bigint, 500::bigint, 3000::bigint, 33000::bigint, 2) $$,
  'conferência: 350 − 0 − 15 − 5 = R$ 330 na mesa (despesa fora)'
);

select throws_ok(
  $$ select public.record_table_entry((select id from ids where name = 't1'), 'rake', 40000) $$,
  '22023',
  'O valor passa das fichas que estão na mesa.',
  'rake não passa das fichas'
);

select throws_ok(
  $$ select public.table_cash_out((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000001', 40000) $$,
  '22023',
  'A devolução passa das fichas que estão na mesa.',
  'devolução não passa das fichas'
);

-- Estorno do rake (dealer pode).
select public.reverse_table_entry((select id from ids where name = 'rake'), 'Errado');
select throws_ok(
  $$ select public.reverse_table_entry((select id from ids where name = 'rake')) $$,
  '22023',
  'Este lançamento já foi estornado.',
  'estorno de mesa não se repete'
);
select is(
  (select chips_cents from public.cash_table_summary((select id from ids where name = 't1'))),
  34500::bigint,
  'estorno do rake devolve as fichas à mesa'
);

select throws_ok(
  $$ select public.close_cash_table((select id from ids where name = 't1')) $$,
  '22023',
  'Ainda há jogadores sentados. Levante todos antes de encerrar.',
  'não encerra com jogadores sentados'
);

-- Jogador 1 devolve R$ 300 e levanta; jogador 2 quebrou e levanta sem devolver.
select public.table_cash_out((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000001', 30000, true);

select is(
  (select left_at is not null from public.cash_table_seats where id = (select id from ids where name = 'seat1')),
  true,
  'devolver com "levantar" encerra o assento'
);

select public.unseat_player((select id from public.cash_table_seats
  where player_id = 'a0000000-0000-4000-8000-000000000002' and left_at is null));

select results_eq(
  format($$ select full_name, buy_in_cents, cash_out_cents, seat_id is null from public.cash_table_players(%L) order by full_name $$,
         (select id from ids where name = 't1')),
  $$ values ('Jogador Dois', 20000::bigint, 0::bigint, true), ('Jogador Um', 15000::bigint, 30000::bigint, true) $$,
  'jogadores da mesa com compras e devoluções'
);

select throws_ok(
  $$ select public.close_cash_table((select id from ids where name = 't1')) $$,
  '22023',
  'A conferência não fecha: as fichas na mesa precisam estar zeradas para encerrar.',
  'não encerra com fichas na mesa (R$ 45)'
);

select throws_ok(
  $$ select public.table_cash_out((select id from ids where name = 't1'), 'a0000000-0000-4000-8000-000000000001', 4500) $$,
  '22023',
  'O jogador não está sentado nesta mesa.',
  'devolução exige jogador sentado'
);

select public.record_table_entry((select id from ids where name = 't1'), 'rake', 4500);

select lives_ok(
  $$ select public.close_cash_table((select id from ids where name = 't1'), 'Tudo certo') $$,
  'encerra com fichas zeradas e sem jogadores'
);

select throws_ok(
  $$ select public.record_table_entry((select id from ids where name = 't1'), 'tip', 100) $$,
  '22023',
  'Esta mesa está encerrada.',
  'mesa encerrada não aceita lançamentos'
);

select throws_ok(
  $$ update public.cash_tables set status = 'open' where id = (select id from ids where name = 't1') $$,
  '42501',
  null,
  'mesa não é alterada direto (só por RPC)'
);

-- ======================= Dono =======================
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.reverse_entry((select id from public.ledger_entries
       where kind = 'cash_out' and table_id = (select id from ids where name = 't1'))) $$,
  '22023',
  'A mesa deste lançamento está encerrada.',
  'estorno de lançamento de mesa encerrada é bloqueado'
);

select throws_ok(
  $$ select public.record_cash_out('a0000000-0000-4000-8000-000000000001', 100, null, (select id from ids where name = 't2')) $$,
  '22023',
  'Devoluções de mesa de cash são lançadas pela tela da mesa.',
  'devolução de mesa só pela tela da mesa'
);

-- Mesa 2: estorno de compra que deixaria fichas negativas.
select public.seat_player((select id from ids where name = 't2'), 'a0000000-0000-4000-8000-000000000003', 10000);
select public.table_cash_out((select id from ids where name = 't2'), 'a0000000-0000-4000-8000-000000000003', 10000);

select throws_ok(
  $$ select public.reverse_entry((select id from public.ledger_entries
       where kind = 'buy_in' and table_id = (select id from ids where name = 't2'))) $$,
  '22023',
  'Estornar esta compra deixaria a mesa com fichas negativas. Estorne a devolução antes.',
  'estorno de compra não deixa fichas negativas'
);

-- ======================= Outro clube =======================
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.cash_table_activity),
  0,
  'outro clube não vê a atividade das mesas'
);

select * from finish();
rollback;
