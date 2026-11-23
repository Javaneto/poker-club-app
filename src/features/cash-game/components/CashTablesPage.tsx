import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { formatTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { useCashGameRealtime, useOpenTables } from '../api/useCashGame';
import { formatBlinds } from '../domain/chips';
import { canOperateCashGame } from '../domain/permissions';
import { ClosedTablesList } from './ClosedTablesList';
import { OpenTableModal } from './OpenTableModal';

/** Mesas de cash: abertas (ao vivo) e histórico das encerradas. */
export function CashTablesPage() {
  const { club } = useActiveClub();
  useCashGameRealtime(club.id);
  const canOperate = canOperateCashGame(club.role);
  const tables = useOpenTables(club.id);
  const [tab, setTab] = useState('open');
  const [opening, setOpening] = useState(false);

  const openList = (
    <div className="flex flex-col gap-3">
      {tables.isPending && <p className="text-muted-foreground text-sm">Carregando…</p>}
      {tables.isError && <p className="text-danger text-sm">Não foi possível carregar as mesas.</p>}
      {tables.data?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma mesa aberta.{canOperate && ' Toque em “Abrir mesa” para começar.'}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {tables.data?.map((table) => (
          <li key={table.id}>
            <Link
              to={`/mesas/${table.id}`}
              className="border-border bg-surface hover:bg-muted/50 flex flex-col gap-1 rounded-lg border p-4"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-lg font-semibold">{table.name}</span>
                {formatBlinds(table.smallBlindCents, table.bigBlindCents, formatCents) && (
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {formatBlinds(table.smallBlindCents, table.bigBlindCents, formatCents)}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground text-sm">
                {table.seatedCount}
                {table.maxPlayers ? `/${table.maxPlayers}` : ''}{' '}
                {table.seatedCount === 1 ? 'jogador' : 'jogadores'} · aberta às{' '}
                {formatTime(table.openedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Cash game</h1>
        {canOperate && <Button onClick={() => setOpening(true)}>Abrir mesa</Button>}
      </header>
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'open', label: 'Abertas', content: openList },
          { value: 'closed', label: 'Encerradas', content: <ClosedTablesList clubId={club.id} /> },
        ]}
      />
      <OpenTableModal clubId={club.id} open={opening} onClose={() => setOpening(false)} />
    </section>
  );
}
