# Importação do banco legado

Esta pasta guarda o que for necessário para migrar os dados do sistema antigo
(`poker-system/`, Supabase legado) para o novo esquema multi-clube.

## `fixtures/` — cópia do banco legado (Fase 0)

> **Não versionar dados pessoais.** Os arquivos de dados (`*.data.sql`, `*.csv`)
> estão no `.gitignore`. Apenas o esquema (`schema.sql`) entra no repositório.

Exportar com a connection string do projeto legado
(Supabase → Project Settings → Database → Connection string, modo *Session*):

```powershell
# esquema (estrutura apenas)
pnpm dlx supabase db dump --db-url "<URL_LEGADO>" -f scripts/migrate-legacy/fixtures/schema.sql
# dados (somente local, não commitar)
pnpm dlx supabase db dump --db-url "<URL_LEGADO>" --data-only -f scripts/migrate-legacy/fixtures/legacy.data.sql
```

A senha do banco legado nunca deve ir para o repositório nem para `.env` versionado.

## Casos de teste reais

Os números de 3 sessões reais (cash e torneio) ficam em
[`docs/real-session-cases.md`](../../docs/real-session-cases.md) e viram testes
unitários do domínio nas Fases 5, 7 e 8.
