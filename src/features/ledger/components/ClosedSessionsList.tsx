import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { formatDateTime } from '@/lib/dates';
import { LEDGER_PAGE_SIZE, type ClosedSession } from '../api/ledgerApi';
import { useClosedSessions, useReopenSession } from '../api/useLedger';
import { SESSION_STATUS_LABELS, sessionStatus } from '../domain/result';
import { BalanceText } from './BalanceText';
import { Pager } from './Pager';

const STATUS_TONE = { pending: 'danger', settled: 'neutral', credit: 'success' } as const;

export interface ClosedSessionsListProps {
  clubId: string;
  playerId?: string;
  canReopen: boolean;
}

/** Sessões finalizadas com status (pendente/realizado/crédito); dono/gerente podem reabrir. */
export function ClosedSessionsList({ clubId, playerId, canReopen }: ClosedSessionsListProps) {
  const [page, setPage] = useState(1);
  const sessions = useClosedSessions(clubId, page, playerId);
  const reopen = useReopenSession(clubId);
  const [reopening, setReopening] = useState<ClosedSession | null>(null);

  if (sessions.isPending) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (sessions.isError) return <p className="text-danger text-sm">Não foi possível carregar.</p>;
  if (sessions.data.total === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma sessão finalizada ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {sessions.data.items.map((session) => {
          const status = sessionStatus(session.resultCents);
          return (
            <li key={session.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <div className="min-w-0 flex-1">
                {!playerId && (
                  <Link
                    to={`/jogadores/${session.playerId}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {session.playerName}
                  </Link>
                )}
                <p className="text-muted-foreground text-xs">
                  Finalizada em {formatDateTime(session.closedAt)}
                  {session.reopenedCount > 0 && ` · reaberta ${session.reopenedCount}x`}
                </p>
              </div>
              <Badge tone={STATUS_TONE[status]}>{SESSION_STATUS_LABELS[status]}</Badge>
              <BalanceText cents={session.resultCents} className="text-sm" />
              {canReopen && (
                <Button variant="ghost" onClick={() => setReopening(session)}>
                  Reabrir
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <Pager
        page={page}
        total={sessions.data.total}
        pageSize={LEDGER_PAGE_SIZE}
        onChange={setPage}
      />

      <Modal
        open={reopening !== null}
        onClose={() => setReopening(null)}
        title="Reabrir sessão?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReopening(null)}>
              Cancelar
            </Button>
            <Button
              disabled={reopen.isPending}
              onClick={() =>
                reopening &&
                reopen.mutate(reopening.id, {
                  onSuccess: () => {
                    toast.success('Sessão reaberta.');
                    setReopening(null);
                  },
                })
              }
            >
              Reabrir
            </Button>
          </>
        }
      >
        <p>
          A sessão volta para as movimentações em aberto para correção (estornos e novos
          lançamentos). A reabertura fica registrada no log.
        </p>
      </Modal>
    </div>
  );
}
