-- RPCs da Fase 3: criar clube, convites, papéis e remoção.
begin;
select plan(17);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'dono@teste.test'),
  ('22222222-2222-4222-8222-222222222222', 'convidado@teste.test'),
  ('33333333-3333-4333-8333-333333333333', 'outro@teste.test');

set local role authenticated;

-- ---- Dono cria o clube ----
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

create temporary table ctx (club_id uuid, token uuid) on commit drop;
grant all on ctx to authenticated;

insert into ctx (club_id) select public.create_club('  Clube Teste  ');

select is(
  (select name from public.clubs where id = (select club_id from ctx)),
  'Clube Teste',
  'create_club cria o clube com o nome sem espaços extras'
);

select is(
  (select role::text from public.club_members
    where club_id = (select club_id from ctx)
      and user_id = '11111111-1111-4111-8111-111111111111'),
  'owner',
  'quem cria o clube vira owner'
);

select throws_ok(
  format($$ insert into public.club_members (club_id, user_id, role)
            values (%L, '33333333-3333-4333-8333-333333333333', 'manager') $$,
         (select club_id from ctx)),
  '42501',
  null,
  'membros não são inseridos direto na tabela'
);

-- ---- Convite ----
update ctx set token = (
  select (public.create_club_invitation(club_id, ' Convidado@Teste.test ', 'cashier')).token
);

select is(
  (select email from public.club_invitations where token = (select token from ctx)),
  'convidado@teste.test',
  'e-mail do convite é normalizado'
);

select is(
  (select status from public.get_invitation_by_token((select token from ctx))),
  'pending',
  'convite novo está pendente'
);

select throws_ok(
  format($$ select public.create_club_invitation(%L, 'dono@teste.test', 'manager') $$,
         (select club_id from ctx)),
  '23505',
  'Essa pessoa já faz parte do clube.',
  'não convida quem já é membro'
);

-- ---- Outro usuário (e-mail diferente) tenta aceitar ----
select set_config('request.jwt.claims', '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}', true);

select throws_ok(
  format($$ select public.accept_club_invitation(%L) $$, (select token from ctx)),
  '42501',
  null,
  'convite não pode ser aceito por outro e-mail'
);

select throws_ok(
  format($$ select public.create_club_invitation(%L, 'x@teste.test', 'owner') $$,
         (select club_id from ctx)),
  '42501',
  null,
  'quem não é dono não convida'
);

select throws_ok(
  format($$ select * from public.list_club_members(%L) $$, (select club_id from ctx)),
  '42501',
  null,
  'quem não é membro não lista a equipe'
);

-- ---- Convidado aceita ----
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);

select is(
  public.accept_club_invitation((select token from ctx)),
  (select club_id from ctx),
  'convidado aceita o convite'
);

select is(
  (select role::text from public.club_members
    where club_id = (select club_id from ctx)
      and user_id = '22222222-2222-4222-8222-222222222222'),
  'cashier',
  'convidado entra com o papel do convite'
);

select throws_ok(
  format($$ select public.accept_club_invitation(%L) $$, (select token from ctx)),
  '22023',
  'Este convite já foi usado.',
  'convite não pode ser usado duas vezes'
);

select is(
  (select count(*)::int from public.list_club_members((select club_id from ctx))),
  2,
  'membro lista a equipe (2 pessoas)'
);

select throws_ok(
  format($$ select public.update_club_member_role(%L, '22222222-2222-4222-8222-222222222222', 'owner') $$,
         (select club_id from ctx)),
  '42501',
  null,
  'caixa não promove a si mesmo'
);

-- ---- Dono gerencia papéis ----
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  format($$ select public.update_club_member_role(%L, '11111111-1111-4111-8111-111111111111', 'manager') $$,
         (select club_id from ctx)),
  '22023',
  'O clube precisa de pelo menos um dono.',
  'último dono não pode deixar de ser dono'
);

select throws_ok(
  format($$ select public.remove_club_member(%L, '11111111-1111-4111-8111-111111111111') $$,
         (select club_id from ctx)),
  '22023',
  'O clube precisa de pelo menos um dono.',
  'último dono não pode sair do clube'
);

select lives_ok(
  format($$ select public.remove_club_member(%L, '22222222-2222-4222-8222-222222222222') $$,
         (select club_id from ctx)),
  'dono remove um membro'
);

select * from finish();
rollback;
