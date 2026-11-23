-- Membro do clube A não lê nem altera dados do clube B; papéis limitam escrita.
begin;
select plan(14);

-- Dois usuários e dois clubes, criados como superusuário.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@teste.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@teste.test'),
  ('33333333-3333-4333-8333-333333333333', 'caixa-a@teste.test');

insert into public.clubs (id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Clube A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Clube B');

insert into public.club_members (club_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'cashier');

select is(
  (select count(*)::int from public.club_settings
    where club_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  2,
  'configurações padrão criadas para cada clube'
);

-- ---- Dono do clube A ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select results_eq(
  'select name from public.clubs order by name',
  array['Clube A'],
  'dono de A vê só o clube A'
);

select is(
  (select count(*)::int from public.club_members where club_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0,
  'dono de A não vê membros de B'
);

select is(
  (select count(*)::int from public.club_settings where club_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0,
  'dono de A não vê configurações de B'
);

select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  0,
  'dono de A não vê o perfil do dono de B'
);

select is(
  (select count(*)::int from public.profiles where id = '33333333-3333-4333-8333-333333333333'),
  1,
  'dono de A vê o perfil de quem é do mesmo clube'
);

update public.clubs set name = 'Invadido' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
reset role;
select is(
  (select name from public.clubs where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'Clube B',
  'dono de A não renomeia o clube B'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.club_members (club_id, user_id, role)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'owner') $$,
  '42501',
  null,
  'dono de A não se adiciona ao clube B'
);

select lives_ok(
  $$ update public.club_settings set pix_key = 'chave-a'
     where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'dono de A altera as configurações do próprio clube'
);

select ok(
  (select count(*) > 0 from public.audit_log
    where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and table_name = 'club_settings' and operation = 'UPDATE'),
  'alteração de configuração aparece no log de auditoria'
);

select is(
  (select count(*)::int from public.audit_log where club_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0,
  'dono de A não vê o log do clube B'
);

select throws_ok(
  'delete from public.audit_log',
  '42501',
  null,
  'ninguém apaga o log de auditoria'
);

-- ---- Caixa do clube A ----
select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.audit_log),
  0,
  'caixa não lê o log de auditoria'
);

update public.club_settings set pix_key = 'chave-do-caixa'
  where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
reset role;
select is(
  (select pix_key from public.club_settings where club_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'chave-a',
  'caixa não altera as configurações do clube'
);

select * from finish();
rollback;
