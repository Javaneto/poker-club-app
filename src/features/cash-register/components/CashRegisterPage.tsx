import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { formatDateTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import {
  useCashRealtime,
  useCashSummary,
  useCashTimeline,
  useOpenCashSession,
} from '../api/useCash';
import { canOperateCash } from '../domain/permissions';
import { CashHistoryList } from './CashHistoryList';
import { CashMovementModal } from './CashMovementModal';
import { CashSummaryPanel } from './CashSummaryPanel';
import { CashTimeline } from './CashTimeline';
import { CloseCashModal } from './CloseCashModal';
import { OpenCashForm } from './OpenCashForm';

export function CashRegisterPage() {
  const { club } = useActiveClub();
  useCashRealtime(club.id);
  const canOperate = canOperateCash(club.role);
  const session = useOpenCashSession(club.id);
  const sessionId = session.data?.id;
  const summary = useCashSummary(club.id, sessionId);
  const timeline = useCashTimeline(club.id, sessionId);
  const [tab, setTab] = useState('today');
  const [movement, setMovement] = useState<'withdrawal' | 'deposit' | null>(null);
  const [closing, setClosing] = useState(false);

  const today = (
    <div className="flex flex-col gap-4">
      {session.isPending && <p className="text-muted-foreground">Carregando…</p>}
      {session.isError && <p className="text-danger">Não foi possível carregar o caixa.</p>}

      {session.data === null &&
        (canOperate ? (
          <OpenCashForm clubId={club.id} />
        ) : (
          <p className="text-muted-foreground">
            O caixa está fechado. Peça ao caixa ou ao gerente para abrir.
          </p>
        ))}

      {session.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-sm">
                Aberto em {formatDateTime(session.data.openedAt)}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {summary.data ? formatCents(summary.data.expectedCashCents) : '…'}
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  esperado em dinheiro
                </span>
              </p>
            </div>
            {canOperate && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setMovement('deposit')}>
                  Suprimento
                </Button>
                <Button variant="secondary" onClick={() => setMovement('withdrawal')}>
                  Sangria
                </Button>
                <Button disabled={!summary.data} onClick={() => setClosing(true)}>
                  Fechar caixa
                </Button>
              </div>
            )}
          </div>

          {summary.data && <CashSummaryPanel summary={summary.data} />}

          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Movimentações</h2>
            <Link
              to={`/caixa/${session.data.id}/relatorio`}
              className="text-primary text-sm underline"
            >
              Relatório / PDF
            </Link>
          </div>
          {timeline.data && <CashTimeline items={timeline.data} />}

          <CashMovementModal
            clubId={club.id}
            sessionId={session.data.id}
            kind={movement}
            onClose={() => setMovement(null)}
          />
          {summary.data && (
            <CloseCashModal
              clubId={club.id}
              sessionId={session.data.id}
              expectedCashCents={summary.data.expectedCashCents}
              open={closing}
              onClose={() => setClosing(false)}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Caixa do Dia</h1>
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'today', label: 'Caixa atual', content: today },
          { value: 'history', label: 'Histórico', content: <CashHistoryList clubId={club.id} /> },
        ]}
      />
    </section>
  );
}
