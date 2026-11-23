-- Novo papel no clube: garçom (waiter). As permissões dele chegam com o módulo Bar (Fase 13);
-- até lá ele só lê o que qualquer membro lê.
alter type public.club_role add value if not exists 'waiter';

comment on type public.club_role is
  'owner: dono; manager: gerente; cashier: caixa; director: diretor de torneio; dealer: dealer; waiter: garçom.';
