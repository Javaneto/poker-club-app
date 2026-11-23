-- Seed de desenvolvimento (só banco LOCAL: `pnpm supabase db reset`). Nunca rodar em prod.
--
-- Usuários de teste (senha de todos: dev-poker-2026):
--   dono@clube.test     → owner
--   gerente@clube.test  → manager
--   caixa@clube.test    → cashier
--
-- Mais abaixo: 20 jogadores de exemplo (dados fictícios).

do $$
declare
  club uuid := '00000000-0000-4000-8000-000000000001';
  users jsonb := '[
    {"id": "00000000-0000-4000-8000-0000000000a1", "email": "dono@clube.test",    "name": "Dono do Clube", "role": "owner"},
    {"id": "00000000-0000-4000-8000-0000000000a2", "email": "gerente@clube.test", "name": "Gerente",       "role": "manager"},
    {"id": "00000000-0000-4000-8000-0000000000a3", "email": "caixa@clube.test",   "name": "Caixa",         "role": "cashier"}
  ]';
  u jsonb;
begin
  for u in select * from jsonb_array_elements(users) loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      (u ->> 'id')::uuid,
      'authenticated',
      'authenticated',
      u ->> 'email',
      extensions.crypt('dev-poker-2026', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', u ->> 'name'),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      (u ->> 'id')::uuid,
      (u ->> 'id'),
      'email',
      jsonb_build_object('sub', u ->> 'id', 'email', u ->> 'email', 'email_verified', true),
      now(), now(), now()
    );
  end loop;

  insert into public.clubs (id, name, created_by)
  values (club, 'Clube de Desenvolvimento', '00000000-0000-4000-8000-0000000000a1');

  insert into public.club_members (club_id, user_id, role)
  select club, (member ->> 'id')::uuid, (member ->> 'role')::public.club_role
  from jsonb_array_elements(users) as member;
end;
$$;

-- 20 jogadores fictícios (CPF/telefone inventados; alguns inativos e sem dados opcionais).
insert into public.players (club_id, full_name, nickname, phone, birth_date, active, created_by)
select
  '00000000-0000-4000-8000-000000000001',
  p.full_name,
  p.nickname,
  p.phone,
  (current_date - make_interval(years => p.age, days => p.days_offset))::date,
  p.active,
  '00000000-0000-4000-8000-0000000000a1'
from (values
  ('Ana Beatriz Costa',     'Bia',      '11990000001', 28,   -3, true),
  ('Bruno Almeida',         'Brunão',   '11990000002', 35,   10, true),
  ('Carlos Eduardo Rocha',  'Cadu',     '11990000003', 42,  -12, true),
  ('Daniela Martins',       null,       '11990000004', 31,   40, true),
  ('Eduardo Ferreira',      'Dudu',     null,          45,   -1, true),
  ('Fernanda Lima',         'Fê',       '11990000006', 26,  100, true),
  ('Gabriel Souza',         'Gabi',     '11990000007', 39,  200, true),
  ('Henrique Barbosa',      null,       '11990000008', 50,  -25, true),
  ('Isabela Ribeiro',       'Isa',      '11990000009', 33,  150, true),
  ('João Pedro Gomes',      'JP',       '11990000010', 29,   -7, true),
  ('Karina Mendes',         null,       null,          37,  300, true),
  ('Lucas Oliveira',        'Luquinha', '11990000012', 24,   60, true),
  ('Marcelo Nogueira',      'Marcelão', '11990000013', 55,  -18, true),
  ('Natália Carvalho',      'Nati',     '11990000014', 30,  250, true),
  ('Otávio Pereira',        null,       '11990000015', 47,   80, false),
  ('Paula Fernandes',       'Paulinha', '11990000016', 34,  -29, true),
  ('Rafael Teixeira',       'Rafa',     '11990000017', 41,  120, true),
  ('Sérgio Moreira',        null,       '11990000018', 60,  -40, false),
  ('Tatiane Araújo',        'Tati',     '11990000019', 27,  180, true),
  ('Vinícius Cardoso',      'Vini',     '11990000020', 36,   -5, true)
) as p(full_name, nickname, phone, age, days_offset, active);
