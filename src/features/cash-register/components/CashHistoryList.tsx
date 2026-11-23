import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Pager } from '@/features/ledger/components/Pager';
import { formatDateTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { CASH_PAGE_SIZE } from '../api/cashApi';
import { useCashHistory } from '../api/useCash';
import { DIFFERENCE_LABELS, differenceStatus } from '../domain/cash';

const TONE = { exact: 'success', over: 'warning', short: 'danger' } as const;

export function CashHistoryList({ clubId }: { clubId: string }) {
  const [page, setPage] = useState(1);
  const history = useCashHistory(clubId, page);

  if (history.isPending) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (history.isError) return <p className="text-danger text-sm">Não foi possível carregar.</p>;
  if (history.data.total === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum caixa fechado ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {history.data.items.map((session) => {
          const status = differenceStatus(session.differenceCents ?? 0);
          return (
            <li key={session.id}>
              <Link
                to={`/caixa/${session.id}/relatorio`}
                className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatDateTime(session.openedAt)} →{' '}
                    {session.closedAt ? formatDateTime(session.closedAt) : '—'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Esperado {formatCents(session.expectedCashCents ?? 0)} · contado{' '}
                    {formatCents(session.countedCents ?? 0)}
                  </p>
                </div>
                <Badge tone={TONE[status]}>
                  {DIFFERENCE_LABELS[status]}
                  {status !== 'exact' && ` ${formatCents(Math.abs(session.differenceCents ?? 0))}`}
                </Badge>
              </Link>
            </li>
          );
        })}
      </ul>
      <Pager page={page} total={history.data.total} pageSize={CASH_PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
