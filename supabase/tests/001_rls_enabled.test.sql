-- Falha se alguma tabela do schema public ficar sem RLS ligado.
begin;
select plan(2);

select is_empty(
  $$
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'todas as tabelas de public têm RLS ligado'
);

-- Toda tabela de negócio (exceto clubs e profiles) precisa de club_id not null.
select is_empty(
  $$
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname not in ('clubs', 'profiles', 'audit_log')
      and not exists (
        select 1
        from pg_catalog.pg_attribute a
        where a.attrelid = c.oid
          and a.attname = 'club_id'
          and a.attnotnull
          and not a.attisdropped
      )
  $$,
  'toda tabela de negócio tem club_id not null'
);

select * from finish();
rollback;
