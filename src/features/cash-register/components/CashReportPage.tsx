import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { formatDateTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { useCashSession, useCashSummary, useCashTimeline } from '../api/useCash';
import { DIFFERENCE_LABELS, differenceStatus } from '../domain/cash';
import { CashSummaryPanel } from './CashSummaryPanel';
import { CashTimeline } from './CashTimeline';

/** Relatório imprimível do caixa ("Imprimir" → "Salvar como PDF"). */
export function CashReportPage() {
  const { sessionId = '' } = useParams();
  const { club } = useActiveClub();
  const session = useCashSession(club.id, sessionId);
  const summary = useCashSummary(club.id, sessionId);
  const timeline = useCashTimeline(club.id, sessionId);

  useEffect(() => {
    document.body.classList.add('report-mode');
    return () => document.body.classList.remove('report-mode');
  }, []);

  if (session.isPending || summary.isPending)
    return <p className="text-muted-foreground p-4">Carregando…</p>;
  if (!session.data || !summary.data) return <p className="p-4">Caixa não encontrado.</p>;

  const data = session.data;
  const status = data.differenceCents === null ? null : differenceStatus(data.differenceCents);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="no-print flex gap-2">
        <Link
          to="/caixa"
          className="border-border bg-surface inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
        >
          Voltar
        </Link>
        <Button onClick={() => window.print()}>Imprimir / salvar PDF</Button>
      </div>

      <header>
        <h1 className="text-xl font-semibold">{club.name} · Relatório do caixa</h1>
        <p className="text-muted-foreground text-sm">
          Aberto em {formatDateTime(data.openedAt)}
          {data.closedAt ? ` · fechado em ${formatDateTime(data.closedAt)}` : ' · ainda aberto'}
        </p>
      </header>

      <CashSummaryPanel summary={summary.data} />

      {data.status === 'closed' && status && (
        <dl className="border-border bg-surface grid grid-cols-3 gap-2 rounded-lg border p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Esperado</dt>
            <dd className="font-semibold tabular-nums">
              {formatCents(data.expectedCashCents ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contado</dt>
            <dd className="font-semibold tabular-nums">{formatCents(data.countedCents ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{DIFFERENCE_LABELS[status]}</dt>
            <dd className="font-semibold tabular-nums">
              {formatCents(Math.abs(data.differenceCents ?? 0))}
            </dd>
          </div>
          {data.closingNote && <p className="col-span-3">Obs.: {data.closingNote}</p>}
        </dl>
      )}

      <h2 className="font-semibold">Movimentações</h2>
      {timeline.data && <CashTimeline items={timeline.data} />}
    </div>
  );
}
