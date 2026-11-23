import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { canOperateLedger } from '@/features/ledger/domain/permissions';
import { PlayerPicker } from '@/features/ledger/components/PlayerPicker';
import { formatDateTime, formatTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { useNow } from '@/lib/useNow';
import type { TableActivity, TablePlayer } from '../api/cashGameApi';
import {
  useCashGameRealtime,
  useTable,
  useTablePlayers,
  useTableSummary,
  useUnseatPlayer,
} from '../api/useCashGame';
import { formatBlinds, type TableEntryKind } from '../domain/chips';
import { canOperateCashGame } from '../domain/permissions';
import { isReversalActivity } from './activityLabel';
import { CashOutModal } from './CashOutModal';
import { CloseTableModal } from './CloseTableModal';
import { PurchaseModal, type PurchaseTarget } from './PurchaseModal';
import { ReverseActivityModal } from './ReverseActivityModal';
import { TableActivityList } from './TableActivityList';
import { TableEntryModal } from './TableEntryModal';
import { TablePlayerCard } from './TablePlayerCard';
import { TableSummaryPanel } from './TableSummaryPanel';

/** Tela da mesa: conferência, jogadores sentados, ações rápidas e histórico (celular primeiro). */
export function CashTablePage() {
  const { tableId = '' } = useParams();
  const { club } = useActiveClub();
  useCashGameRealtime(club.id);
  const now = useNow();
  const table = useTable(club.id, tableId);
  const summary = useTableSummary(club.id, tableId);
  const players = useTablePlayers(club.id, tableId);
  const unseat = useUnseatPlayer(club.id);

  const [picking, setPicking] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseTarget | null>(null);
  const [cashOut, setCashOut] = useState<{ id: string; name: string } | null>(null);
  const [unseating, setUnseating] = useState<TablePlayer | null>(null);
  const [entryKind, setEntryKind] = useState<TableEntryKind | null>(null);
  const [reversing, setReversing] = useState<TableActivity | null>(null);
  const [closing, setClosing] = useState(false);

  if (table.isPending) return <p className="text-muted-foreground">Carregando…</p>;
  if (table.isError) return <p className="text-danger">Não foi possível carregar a mesa.</p>;
  if (!table.data) {
    return (
      <div className="flex flex-col gap-2">
        <p>Mesa não encontrada.</p>
        <Link to="/mesas" className="text-primary underline">
          Voltar para as mesas
        </Link>
      </div>
    );
  }

  const isOpen = table.data.status === 'open';
  const blinds = formatBlinds(table.data.smallBlindCents, table.data.bigBlindCents, formatCents);
  const canOperate = isOpen && canOperateCashGame(club.role);
  const canReverseLedger = isOpen && canOperateLedger(club.role);
  const chips = summary.data?.chipsCents ?? 0;
  const seated = (players.data ?? []).filter((player) => player.seatId !== null);
  const left = (players.data ?? []).filter((player) => player.seatId === null);
  const isFull = table.data.maxPlayers !== null && seated.length >= table.data.maxPlayers;

  const canReverse = (item: TableActivity) =>
    !item.isReversed &&
    !isReversalActivity(item) &&
    (item.source === 'table' ? canOperate : canReverseLedger);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Link to="/mesas" className="text-primary text-sm">
          ← Mesas
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{table.data.name}</h1>
          <Badge tone={isOpen ? 'success' : 'neutral'}>{isOpen ? 'Aberta' : 'Encerrada'}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {blinds && `${blinds} · `}
          {seated.length}
          {table.data.maxPlayers ? `/${table.data.maxPlayers}` : ''} sentados · aberta às{' '}
          {formatTime(table.data.openedAt)}
          {table.data.closedAt && ` · encerrada em ${formatDateTime(table.data.closedAt)}`}
        </p>
        {table.data.note && <p className="text-muted-foreground text-sm">{table.data.note}</p>}
        {table.data.closingNote && (
          <p className="text-muted-foreground text-sm">Encerramento: {table.data.closingNote}</p>
        )}
      </header>

      {summary.data && <TableSummaryPanel summary={summary.data} />}

      {canOperate && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            size="lg"
            className="col-span-2 sm:col-span-1"
            disabled={isFull}
            onClick={() => setPicking(true)}
          >
            {isFull ? 'Mesa cheia' : 'Sentar jogador'}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setEntryKind('rake')}>
            Rake
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setEntryKind('tip')}>
            Capilé
          </Button>
          <Button variant="secondary" onClick={() => setEntryKind('expense')}>
            Despesa
          </Button>
          <Button variant="ghost" disabled={!summary.data} onClick={() => setClosing(true)}>
            Encerrar mesa
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Sentados ({seated.length})</h2>
        {players.isError && <p className="text-danger text-sm">Não foi possível carregar.</p>}
        {players.data && seated.length === 0 && (
          <p className="text-muted-foreground text-sm">Ninguém sentado.</p>
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {seated.map((player) => {
            const target = { id: player.playerId, name: player.fullName };
            return (
              <TablePlayerCard
                key={player.playerId}
                player={player}
                now={now}
                actions={
                  canOperate
                    ? {
                        onBuy: () => setPurchase({ mode: 'buy', player: target }),
                        onCashOut: () => setCashOut(target),
                        onUnseat: () => setUnseating(player),
                      }
                    : undefined
                }
              />
            );
          })}
        </ul>
      </div>

      {left.length > 0 && (
        <details className="flex flex-col gap-2">
          <summary className="flex min-h-10 cursor-pointer items-center font-semibold">
            Já saíram ({left.length})
          </summary>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {left.map((player) => (
              <TablePlayerCard key={player.playerId} player={player} now={now} />
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Lançamentos da mesa</h2>
        <TableActivityList
          clubId={club.id}
          tableId={tableId}
          canReverse={canReverse}
          onReverse={setReversing}
        />
      </div>

      <PlayerPicker
        clubId={club.id}
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(player) => {
          setPicking(false);
          setPurchase({ mode: 'seat', player });
        }}
      />
      <PurchaseModal
        clubId={club.id}
        tableId={tableId}
        target={purchase}
        onClose={() => setPurchase(null)}
      />
      <CashOutModal
        clubId={club.id}
        tableId={tableId}
        player={cashOut}
        chipsOnTableCents={chips}
        onClose={() => setCashOut(null)}
      />
      <TableEntryModal
        clubId={club.id}
        tableId={tableId}
        kind={entryKind}
        chipsOnTableCents={chips}
        onClose={() => setEntryKind(null)}
      />
      <ReverseActivityModal clubId={club.id} item={reversing} onClose={() => setReversing(null)} />
      {summary.data && (
        <CloseTableModal
          clubId={club.id}
          tableId={tableId}
          summary={summary.data}
          open={closing}
          onClose={() => setClosing(false)}
        />
      )}
      <Modal
        open={unseating !== null}
        onClose={() => setUnseating(null)}
        title="Levantar sem devolução"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUnseating(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={unseat.isPending}
              onClick={() => {
                if (!unseating?.seatId) return;
                unseat.mutate(unseating.seatId, {
                  onSuccess: () => {
                    toast.success('Jogador levantou da mesa.');
                    setUnseating(null);
                  },
                });
              }}
            >
              Levantar
            </Button>
          </>
        }
      >
        <p className="text-sm">
          <strong>{unseating?.fullName}</strong> sai da mesa sem devolver fichas (ex.: quebrou). Se
          o jogador ainda tem fichas, use “Devolver” com “levanta da mesa”.
        </p>
      </Modal>
    </section>
  );
}
