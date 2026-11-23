import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { BalanceText } from '@/features/ledger/components/BalanceText';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { PlayerSort, PlayerStatusFilter } from '../api/playersApi';
import { usePlayerList } from '../api/usePlayers';
import { canManagePlayers } from '../domain/permissions';
import { formatPhone } from '../domain/players';
import { pageCount } from '../domain/search';
import { BirthdaysCard } from './BirthdaysCard';

const STATUS_OPTIONS: { value: PlayerStatusFilter; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'all', label: 'Todos' },
  { value: 'playing', label: 'Em jogo' },
  { value: 'owing', label: 'Devendo' },
  { value: 'credit', label: 'Com crédito' },
];

function readStatus(value: string | null): PlayerStatusFilter {
  return STATUS_OPTIONS.find((option) => option.value === value)?.value ?? 'active';
}

function readSort(value: string | null): PlayerSort {
  return value === 'recent' ? 'recent' : 'name';
}

export function PlayersPage() {
  const { club } = useActiveClub();
  const [params, setParams] = useSearchParams();
  const status = readStatus(params.get('status'));
  const sort = readSort(params.get('sort'));
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(search);

  function update(changes: Record<string, string | null>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  }

  // A busca digitada vai para a URL (e volta para a página 1).
  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedSearch) update({ q: debouncedSearch, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à busca
  }, [debouncedSearch]);

  const list = usePlayerList({
    clubId: club.id,
    search: params.get('q') ?? '',
    status,
    sort,
    page,
  });
  const total = list.data?.total ?? 0;
  const pages = pageCount(total);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Jogadores</h1>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {list.data ? `${total} ${total === 1 ? 'jogador' : 'jogadores'}` : ' '}
          </p>
        </div>
        {canManagePlayers(club.role) && (
          <Link
            to="/jogadores/novo"
            className="bg-primary text-primary-foreground inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
          >
            Novo jogador
          </Link>
        )}
      </header>

      <BirthdaysCard />

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Buscar jogador</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, apelido, telefone ou CPF"
            className="border-border bg-surface focus-visible:ring-ring h-10 w-full rounded-lg border px-3 focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
        <div className="flex gap-2">
          <label>
            <span className="sr-only">Situação</span>
            <select
              value={status}
              onChange={(event) => update({ status: event.target.value, page: null })}
              className="border-border bg-surface h-10 rounded-lg border px-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Ordenar por</span>
            <select
              value={sort}
              onChange={(event) => update({ sort: event.target.value, page: null })}
              className="border-border bg-surface h-10 rounded-lg border px-2"
            >
              <option value="name">Nome (A–Z)</option>
              <option value="recent">Mais recentes</option>
            </select>
          </label>
        </div>
      </div>

      {list.isPending && <p className="text-muted-foreground">Carregando…</p>}
      {list.isError && <p className="text-danger">Não foi possível carregar os jogadores.</p>}

      {list.data && list.data.items.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          {params.get('q')
            ? 'Nenhum jogador encontrado para essa busca.'
            : 'Nenhum jogador aqui ainda.'}
        </p>
      )}

      {list.data && list.data.items.length > 0 && (
        <ul
          className={`divide-border border-border bg-surface divide-y rounded-lg border ${list.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          {list.data.items.map((player) => (
            <li key={player.id}>
              <Link
                to={`/jogadores/${player.id}`}
                className="hover:bg-muted/50 flex min-h-14 items-center gap-3 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {player.fullName}
                    {player.nickname && (
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        · {player.nickname}
                      </span>
                    )}
                  </p>
                  {player.phone && (
                    <p className="text-muted-foreground text-sm">{formatPhone(player.phone)}</p>
                  )}
                </div>
                {!player.active && <Badge>Inativo</Badge>}
                {player.openSessionId && <Badge tone="success">em jogo</Badge>}
                {player.balanceCents !== 0 && (
                  <BalanceText cents={player.balanceCents} className="text-sm" />
                )}
                <span aria-hidden="true" className="text-muted-foreground">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground text-sm">
            Página {page} de {pages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= pages}
            onClick={() => update({ page: String(page + 1) })}
          >
            Próxima
          </Button>
        </nav>
      )}
    </section>
  );
}
