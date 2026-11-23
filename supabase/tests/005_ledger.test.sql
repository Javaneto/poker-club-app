-- Conta do jogador: lançamentos, saldo corrido, estornos, sessões e permissões.
begin;
select plan(30);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'dono@teste.test'),
  ('22222222-2222-4222-8222-222222222222', 'caixa@teste.test'),
  ('33333333-3333-4333-8333-333333333333', 'dealer@teste.test'),
  ('44444444-4444-4444-8444-444444444444', 'outro@teste.test');

insert into public.clubs (id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Clube A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Clube B');

insert into public.club_members (club_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'cashier'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'dealer'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-444444444444', 'owner');

insert into public.players (id, club_id, full_name, active) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jogador Um', true),
  ('a0000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jogador Dois', true),
  ('a0000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Inativo', false);

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;

-- ======================= Caixa opera a noite =======================
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

-- Caixa aberto (Fase 6): lançamentos com dinheiro exigem caixa.
select public.open_cash_session('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0);

-- Compra R$ 100 paga no PIX, duas de R$ 100 fiado, sai com R$ 180, paga R$ 50 em dinheiro.
insert into ids values ('paid', public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 10000, true, (select id from public.payment_methods where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'pix')));
insert into ids values ('fiado1', public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 10000));
insert into ids values ('fiado2', public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 10000));
insert into ids values ('out', public.record_cash_out('a0000000-0000-4000-8000-000000000001', 18000));
insert into ids values ('pay', public.record_payment('a0000000-0000-4000-8000-000000000001', 'payment_in', 5000, (select id from public.payment_methods where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'cash'), 'Pagou parte'));

select is(
  (select count(*)::int from public.player_sessions
    where player_id = 'a0000000-0000-4000-8000-000000000001' and status = 'open'),
  1,
  'lançamentos da noite caem numa única sessão aberta'
);

select is(
  (select effect_cents from public.ledger_entries where id = (select id from ids where name = 'paid')),
  0::bigint,
  'compra paga na hora não mexe no resultado'
);

select is(
  (select open_result_cents from public.player_overview where id = 'a0000000-0000-4000-8000-000000000001'),
  3000::bigint,
  'resultado da sessão = 180 − 200 + 50 = R$ 30 (fórmula do legado)'
);

select throws_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 10000, true, null) $$,
  '22023',
  'Informe a forma de pagamento.',
  'compra paga na hora exige forma de pagamento'
);

select throws_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 0) $$,
  '23514',
  null,
  'valor precisa ser positivo'
);

select throws_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000003', 'buy_in', 1000) $$,
  '22023',
  'Jogador inativo. Reative o cadastro para lançar.',
  'jogador inativo não recebe lançamento de jogo'
);

select lives_ok(
  $$ select public.record_payment('a0000000-0000-4000-8000-000000000003', 'payment_in', 1000, (select id from public.payment_methods where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'pix')) $$,
  'jogador inativo pode quitar dívida (pagamento avulso)'
);

select is(
  (select session_id from public.ledger_entries
    where player_id = 'a0000000-0000-4000-8000-000000000003'),
  null,
  'pagamento sem sessão aberta fica avulso'
);

-- ---- Imutabilidade ----
select throws_ok(
  format($$ update public.ledger_entries set amount_cents = 1 where id = %L $$, (select id from ids where name = 'out')),
  '42501',
  null,
  'lançamento não pode ser alterado'
);

select throws_ok(
  format($$ delete from public.ledger_entries where id = %L $$, (select id from ids where name = 'out')),
  '42501',
  null,
  'lançamento não pode ser apagado'
);

-- ---- Estorno ----
insert into ids values ('rev', public.reverse_entry((select id from ids where name = 'fiado2'), 'Lançado em dobro'));

select is(
  (select effect_cents from public.ledger_entries where id = (select id from ids where name = 'rev')),
  10000::bigint,
  'estorno inverte o efeito do original'
);

select is(
  (select open_result_cents from public.player_overview where id = 'a0000000-0000-4000-8000-000000000001'),
  13000::bigint,
  'resultado volta a R$ 130 depois do estorno'
);

select throws_ok(
  format($$ select public.reverse_entry(%L) $$, (select id from ids where name = 'fiado2')),
  '22023',
  'Este lançamento já foi estornado.',
  'não estorna duas vezes'
);

select throws_ok(
  format($$ select public.reverse_entry(%L) $$, (select id from ids where name = 'rev')),
  '22023',
  'Um estorno não pode ser estornado.',
  'não estorna um estorno'
);

-- ---- Finalizar sessão ----
select is(
  public.close_player_session((select open_session_id from public.player_overview where id = 'a0000000-0000-4000-8000-000000000001')),
  13000::bigint,
  'finalizar devolve o resultado da sessão'
);

select is(
  (select result_cents from public.player_sessions
    where player_id = 'a0000000-0000-4000-8000-000000000001' and status = 'closed'),
  13000::bigint,
  'resultado fica congelado na sessão finalizada'
);

select throws_ok(
  format($$ select public.reverse_entry(%L) $$, (select id from ids where name = 'out')),
  '22023',
  'A sessão deste lançamento está finalizada. Reabra a sessão para estornar.',
  'estornar lançamento de sessão finalizada exige reabrir'
);

-- Próxima noite: perde R$ 200 fiado. Saldo corrido = 130 − 200 = −70.
select public.record_entry('a0000000-0000-4000-8000-000000000001', 'tournament_entry', 20000);

select is(
  (select balance_cents from public.player_overview where id = 'a0000000-0000-4000-8000-000000000001'),
  -7000::bigint,
  'saldo corrido: crédito da noite anterior abate a dívida nova'
);

select is(
  (select open_result_cents from public.player_overview where id = 'a0000000-0000-4000-8000-000000000001'),
  -20000::bigint,
  'a sessão nova mostra só o resultado da noite'
);

-- "Finalizar todos" pega também o Jogador Dois, que entra agora.
select public.record_entry('a0000000-0000-4000-8000-000000000002', 'buy_in', 5000);

select is(
  public.close_all_sessions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  2,
  'finalizar todos fecha todas as sessões abertas do clube'
);

select is(
  (select count(*)::int from public.player_sessions where status = 'open'),
  0,
  'nenhuma sessão aberta depois de finalizar todos'
);

select throws_ok(
  format($$ select public.reopen_session(%L) $$,
    (select id from public.player_sessions where player_id = 'a0000000-0000-4000-8000-000000000002')),
  '42501',
  'Apenas o dono ou o gerente pode reabrir sessões.',
  'caixa não reabre sessão'
);

-- ======================= Dealer só consulta =======================
select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000002', 'buy_in', 5000) $$,
  '42501',
  'Seu papel no clube não permite fazer lançamentos.',
  'dealer não lança'
);

select ok(
  (select count(*) > 0 from public.ledger_entries),
  'dealer consulta os lançamentos do clube'
);

select throws_ok(
  $$ insert into public.ledger_entries (club_id, player_id, kind, amount_cents, effect_cents)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a0000000-0000-4000-8000-000000000002', 'cash_out', 1, 1) $$,
  '42501',
  null,
  'ninguém insere direto na tabela'
);

-- ======================= Outro clube =======================
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.ledger_entries),
  0,
  'dono de B não vê lançamentos de A'
);

select throws_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000002', 'buy_in', 5000) $$,
  '42501',
  null,
  'dono de B não lança em jogador de A'
);

-- ======================= Dono =======================
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  format($$ select public.reopen_session(%L) $$,
    (select id from public.player_sessions where player_id = 'a0000000-0000-4000-8000-000000000002')),
  'dono reabre sessão finalizada'
);

select is(
  (select reopened_count from public.player_sessions where player_id = 'a0000000-0000-4000-8000-000000000002'),
  1,
  'reabertura fica registrada na sessão'
);

select throws_ok(
  $$ select public.delete_player('a0000000-0000-4000-8000-000000000002') $$,
  '23503',
  'Jogador com lançamentos não pode ser excluído. Use Inativar.',
  'jogador com lançamentos não pode ser excluído'
);

select * from finish();
rollback;
