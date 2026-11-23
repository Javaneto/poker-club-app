import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { LEDGER_PAGE_SIZE, type LedgerEntry } from '../api/ledgerApi';
import { useLedgerRealtime, usePlayerEntries } from '../api/useLedger';
import { canOperateLedger, canReopenSessions } from '../domain/permissions';
import type { EntryFormKind } from '../schemas';
import { BalanceText } from './BalanceText';
import { ClosedSessionsList } from './ClosedSessionsList';
import { EntryRow } from './EntryRow';
import { MovementModal } from './MovementModal';
import { Pager } from './Pager';
import { ReverseEntryModal } from './ReverseEntryModal';

export interface PlayerAccountPanelProps {
  player: {
    id: string;
    fullName: string;
    active: boolean;
    balanceCents: number;
    openSessionId: string | null;
    openResultCents: number;
  };
}

/** Saldo, sessão aberta, lançamentos e sessões finalizadas na ficha do jogador. */
export function PlayerAccountPanel({ player }: PlayerAccountPanelProps) {
  const { club } = useActiveClub();
  useLedgerRealtime(club.id);
  const canOperate = canOperateLedger(club.role);
  const [tab, setTab] = useState('entries');
  const [page, setPage] = useState(1);
  const entries = usePlayerEntries(club.id, player.id, page);
  const [movementKind, setMovementKind] = useState<EntryFormKind | null>(null);
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);

  const canReverse = (entry: LedgerEntry) =>
    canOperate && entry.kind !== 'reversal' && entry.reversedById === null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="border-border bg-surface rounded-lg border p-3">
          <p className="text-muted-foreground text-sm">Saldo geral</p>
          <BalanceText cents={player.balanceCents} verbose className="text-lg" />
        </div>
        <div className="border-border bg-surface rounded-lg border p-3">
          <p className="text-muted-foreground text-sm">Sessão em aberto</p>
          {player.openSessionId ? (
            <BalanceText cents={player.openResultCents} className="text-lg" />
          ) : (
            <span className="text-muted-foreground text-lg">—</span>
          )}
        </div>
      </div>

      {canOperate && (
        <div className="flex flex-wrap gap-2">
          {player.active && <Button onClick={() => setMovementKind('buy_in')}>Lançar</Button>}
          <Button variant="secondary" onClick={() => setMovementKind('payment_in')}>
            Registrar pagamento
          </Button>
          {player.openSessionId && (
            <Link
              to="/movimentacoes"
              className="border-border bg-surface hover:bg-muted inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
            >
              Ver em aberto
            </Link>
          )}
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: 'entries',
            label: 'Lançamentos',
            content: (
              <div className="flex flex-col gap-3">
                {entries.data?.total === 0 && (
                  <p className="text-muted-foreground text-sm">Nenhum lançamento ainda.</p>
                )}
                {(entries.data?.items.length ?? 0) > 0 && (
                  <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
                    {entries.data?.items.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        showDate
                        actions={
                          <span className="flex gap-1">
                            {(entry.kind === 'payment_in' || entry.kind === 'payout') && (
                              <Link
                                to={`/recibo/${entry.id}`}
                                className="text-muted-foreground hover:bg-muted inline-flex h-10 items-center rounded-lg px-2 text-sm"
                              >
                                Recibo
                              </Link>
                            )}
                            {canReverse(entry) && (
                              <Button variant="ghost" onClick={() => setReversing(entry)}>
                                Estornar
                              </Button>
                            )}
                          </span>
                        }
                      />
                    ))}
                  </ul>
                )}
                <Pager
                  page={page}
                  total={entries.data?.total ?? 0}
                  pageSize={LEDGER_PAGE_SIZE}
                  onChange={setPage}
                />
              </div>
            ),
          },
          {
            value: 'sessions',
            label: 'Sessões',
            content: (
              <ClosedSessionsList
                clubId={club.id}
                playerId={player.id}
                canReopen={canReopenSessions(club.role)}
              />
            ),
          },
        ]}
      />

      <MovementModal
        clubId={club.id}
        player={movementKind ? { id: player.id, name: player.fullName } : null}
        defaultKind={movementKind ?? 'buy_in'}
        onClose={() => setMovementKind(null)}
      />
      <ReverseEntryModal clubId={club.id} entry={reversing} onClose={() => setReversing(null)} />
    </div>
  );
}
