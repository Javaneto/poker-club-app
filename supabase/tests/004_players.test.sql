-- Jogadores: unicidade, papéis, isolamento, exclusão e aniversariantes.
begin;
select plan(15);

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

insert into public.players (id, club_id, full_name, nickname, phone, cpf, birth_date) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'José da Silva', 'Zé', '11987654321', '52998224725', '1990-01-10'),
  ('a0000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Maria Souza', null, null, null, '1992-02-29'),
  ('a0000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pedro Lima', null, null, null, '1985-12-30'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'José da Silva', null, null, '52998224725', null);

select is(
  (select search_text from public.players where id = 'a0000000-0000-4000-8000-000000000001'),
  'jose da silva ze 11987654321 52998224725',
  'search_text junta nome, apelido, telefone e CPF sem acentos'
);

select throws_ok(
  $$ insert into public.players (club_id, full_name)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '  JOSE DA SILVA ') $$,
  '23505',
  'Já existe um jogador com esse nome no clube.',
  'nome é único no clube sem diferenciar maiúsculas e acentos'
);

select throws_ok(
  $$ insert into public.players (club_id, full_name, cpf)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Outro Nome', '52998224725') $$,
  '23505',
  'Já existe um jogador com esse CPF no clube.',
  'CPF é único no clube'
);

select throws_ok(
  $$ insert into public.players (club_id, full_name, phone)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Telefone Ruim', '(11) 9999') $$,
  '23514',
  null,
  'telefone só com dígitos'
);

set local role authenticated;

-- ---- Caixa cadastra e edita ----
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.players (club_id, full_name)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Novo Jogador') $$,
  'caixa cadastra jogador'
);

select is(
  (select count(*)::int from public.players),
  4,
  'caixa vê só os jogadores do próprio clube'
);

select throws_ok(
  $$ select public.delete_player('a0000000-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'caixa não exclui jogador'
);

select throws_ok(
  $$ delete from public.players where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '42501',
  null,
  'delete direto na tabela é recusado'
);

-- ---- Dealer só lê ----
select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.players (club_id, full_name)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Do Dealer') $$,
  '42501',
  null,
  'dealer não cadastra jogador'
);

update public.players set nickname = 'hack' where id = 'a0000000-0000-4000-8000-000000000003';
select is(
  (select nickname from public.players where id = 'a0000000-0000-4000-8000-000000000003'),
  null,
  'dealer não edita jogador'
);

-- ---- Dono de B não alcança A ----
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.delete_player('a0000000-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'dono de outro clube não exclui jogador de A'
);

select throws_ok(
  $$ select * from public.upcoming_birthdays('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$,
  '42501',
  null,
  'quem não é membro não vê aniversariantes'
);

-- ---- Dono de A ----
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

-- Referência 20/12/2026: janela de 30 dias cruza o ano (Pedro 30/12, José 10/01).
select results_eq(
  $$ select full_name, next_birthday, turning_age
       from public.upcoming_birthdays('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 30, '2026-12-20') $$,
  $$ values ('Pedro Lima', date '2026-12-30', 41), ('José da Silva', date '2027-01-10', 37) $$,
  'aniversariantes atravessam a virada do ano, em ordem de data'
);

-- 29/02 em ano não bissexto cai em 28/02.
select results_eq(
  $$ select full_name, next_birthday from public.upcoming_birthdays('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 10, '2027-02-20') $$,
  $$ values ('Maria Souza', date '2027-02-28') $$,
  'aniversário em 29/02 cai em 28/02 em ano comum'
);

select lives_ok(
  $$ select public.delete_player('a0000000-0000-4000-8000-000000000003') $$,
  'dono exclui jogador'
);

select * from finish();
rollback;
