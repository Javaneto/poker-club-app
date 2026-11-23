-- Caixa do Dia: abertura, vínculo dos lançamentos, sangria/suprimento, fechamento e formas de pagamento.
begin;
select plan(21);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'dono@teste.test'),
  ('22222222-2222-4222-8222-222222222222', 'caixa@teste.test'),
  ('33333333-3333-4333-8333-333333333333', 'diretor@teste.test');

insert into public.clubs (id, name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Clube A');

insert into public.club_members (club_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'cashier'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'director');

insert into public.players (id, club_id, full_name) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jogador Um');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids select 'cash', id from public.payment_methods where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'cash';
insert into ids select 'pix', id from public.payment_methods where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'pix';

select is(
  (select count(*)::int from public.payment_methods where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  4,
  'clube novo recebe 4 formas de pagamento padrão'
);

set local role authenticated;

-- ======================= Diretor (lança, mas não opera caixa) =======================
select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 5000, true, (select id from ids where name = 'cash')) $$,
  '22023',
  'Abra o caixa antes de receber ou pagar em dinheiro, PIX ou cartão.',
  'sem caixa aberto, compra paga na hora é bloqueada'
);

select lives_ok(
  $$ select public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 5000) $$,
  'compra fiada não depende do caixa'
);

select throws_ok(
  $$ select public.open_cash_session('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 10000) $$,
  '42501',
  'Seu papel no clube não permite operar o caixa.',
  'diretor não abre caixa'
);

-- ======================= Caixa =======================
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

insert into ids values ('session', public.open_cash_session('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 20000));

select throws_ok(
  $$ select public.open_cash_session('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0) $$,
  '22023',
  'Já existe um caixa aberto neste clube.',
  'só um caixa aberto por clube'
);

-- Abertura R$ 200; compra R$ 100 em dinheiro; compra R$ 50 no PIX; pagamento R$ 30 em dinheiro;
-- pagamento ao jogador R$ 40 em dinheiro; suprimento R$ 100; sangria R$ 150.
select public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 10000, true, (select id from ids where name = 'cash'));
select public.record_entry('a0000000-0000-4000-8000-000000000001', 'buy_in', 5000, true, (select id from ids where name = 'pix'));
insert into ids values ('pay', public.record_payment('a0000000-0000-4000-8000-000000000001', 'payment_in', 3000, (select id from ids where name = 'cash')));
select public.record_payment('a0000000-0000-4000-8000-000000000001', 'payout', 4000, (select id from ids where name = 'cash'));
select public.deposit((select id from ids where name = 'session'), 10000, 'Troco');
select public.withdraw((select id from ids where name = 'session'), 15000, 'Cofre');

select is(
  (select count(*)::int from public.ledger_entries where cash_session_id = (select id from ids where name = 'session')),
  4,
  'lançamentos com dinheiro ficam no caixa aberto'
);

select is(
  (select cash_session_id from public.ledger_entries where kind = 'buy_in' and not paid_upfront),
  null,
  'compra fiada não entra no caixa'
);

select results_eq(
  format($$ select opening_cents, cash_in_cents, cash_out_cents, deposits_cents, withdrawals_cents, expected_cash_cents
            from public.cash_session_summary(%L) $$, (select id from ids where name = 'session')),
  $$ values (20000::bigint, 13000::bigint, 4000::bigint, 10000::bigint, 15000::bigint, 24000::bigint) $$,
  'esperado em dinheiro = 200 + 130 − 40 + 100 − 150 = R$ 240 (PIX fora)'
);

select is(
  (select (m ->> 'in_cents')::bigint
     from public.cash_session_summary((select id from ids where name = 'session')) s,
          jsonb_array_elements(s.by_method) m
    where m ->> 'kind' = 'pix'),
  5000::bigint,
  'PIX aparece no total por forma'
);

-- Estorno de pagamento em dinheiro devolve o dinheiro pelo caixa aberto.
select public.reverse_entry((select id from ids where name = 'pay'), 'Pagamento duplicado');

select is(
  (select expected_cash_cents from public.cash_session_summary((select id from ids where name = 'session'))),
  21000::bigint,
  'estorno de pagamento em dinheiro reduz o esperado (R$ 240 − 30)'
);

-- Forma desativada não pode ser usada (só dono/gerente altera formas).
update public.payment_methods set active = false where id = (select id from ids where name = 'pix');
select is(
  (select active from public.payment_methods where id = (select id from ids where name = 'pix')),
  true,
  'caixa não altera formas de pagamento'
);

select throws_ok(
  $$ select public.close_cash_session((select id from ids where name = 'session'), -1) $$,
  '22023',
  'Informe o valor contado em dinheiro.',
  'valor contado não pode ser negativo'
);

select is(
  public.close_cash_session((select id from ids where name = 'session'), 20500, 'Faltou troco'),
  -500::bigint,
  'fechamento devolve a diferença (contado R$ 205 − esperado R$ 210)'
);

select results_eq(
  format($$ select status::text, expected_cash_cents, counted_cents, difference_cents
            from public.cash_sessions where id = %L $$, (select id from ids where name = 'session')),
  $$ values ('closed', 21000::bigint, 20500::bigint, -500::bigint) $$,
  'valores do fechamento ficam congelados'
);

select throws_ok(
  $$ select public.deposit((select id from ids where name = 'session'), 100) $$,
  '22023',
  'Este caixa já foi fechado.',
  'caixa fechado não recebe movimentos'
);

select throws_ok(
  format($$ delete from public.cash_movements where cash_session_id = %L $$, (select id from ids where name = 'session')),
  '42501',
  null,
  'movimentos do caixa não podem ser apagados'
);

-- ======================= Dono =======================
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ update public.payment_methods set active = false where id = (select id from ids where name = 'pix') $$,
  'dono desativa uma forma de pagamento'
);

select public.open_cash_session('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0);

select throws_ok(
  $$ select public.record_payment('a0000000-0000-4000-8000-000000000001', 'payment_in', 100, (select id from ids where name = 'pix')) $$,
  '22023',
  'Esta forma de pagamento está desativada.',
  'forma desativada não aceita lançamentos'
);

select throws_ok(
  $$ update public.payment_methods set kind = 'other' where id = (select id from ids where name = 'cash') $$,
  '22023',
  'O tipo da forma de pagamento não pode ser alterado.',
  'tipo da forma não muda'
);

select lives_ok(
  $$ insert into public.payment_methods (club_id, kind, name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'other', 'Vale') $$,
  'dono cria forma personalizada'
);

-- Clube que não exige caixa aberto: lançamento com dinheiro passa sem caixa.
select public.close_cash_session((select id from public.cash_sessions where status = 'open'), 0);
update public.club_settings set require_open_cash_session = false
  where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$ select public.record_payment('a0000000-0000-4000-8000-000000000001', 'payment_in', 100, (select id from ids where name = 'cash')) $$,
  'com a exigência desligada, pagamento passa sem caixa aberto'
);

select * from finish();
rollback;
