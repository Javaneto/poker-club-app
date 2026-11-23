-- Seed de desenvolvimento (só banco LOCAL: `pnpm supabase db reset`). Nunca rodar em prod.
--
-- Usuários de teste (senha de todos: dev-poker-2026):
--   dono@clube.test     → owner
--   gerente@clube.test  → manager
--   caixa@clube.test    → cashier
--
-- Os 20 jogadores entram no seed da Fase 4, quando a tabela players existir.

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
