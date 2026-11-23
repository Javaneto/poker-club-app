import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Pager } from '@/features/ledger/components/Pager';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { TABLE_PAGE_SIZE, type TableActivity } from '../api/cashGameApi';
import { useTableActivity } from '../api/useCashGame';
import { activityLabel, isReversalActivity } from './activityLabel';

export interface TableActivityListProps {
  clubId: string;
  tableId: string;
  /** Diz se a linha pode ser estornada por quem está usando (papel + mesa aberta). */
  canReverse: (item: TableActivity) => boolean;
  onReverse: (item: TableActivity) => void;
}

function detail(item: TableActivity): string | null {
  if (item.source === 'ledger') {
    const payment =
      item.kind === 'buy_in' ? (item.paidUpfront ? (item.methodName ?? 'pago') : 'fiado') : null;
    return [item.playerName, payment].filter(Boolean).join(' · ');
  }
  return null;
}

/** Histórico da mesa (mais recentes primeiro), paginado. */
export function TableActivityList({
  clubId,
  tableId,
  canReverse,
  onReverse,
}: TableActivityListProps) {
  const [page, setPage] = useState(1);
  const activity = useTableActivity(clubId, tableId, page);

  if (activity.isPending) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (activity.isError) return <p className="text-danger text-sm">Não foi possível carregar.</p>;
  if (activity.data.total === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum lançamento nesta mesa ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {activity.data.items.map((item) => {
          const reversal = isReversalActivity(item);
          const sub = [detail(item), item.note].filter(Boolean).join(' · ');
          return (
            <li key={`${item.source}:${item.id}`} className="flex items-center gap-3 px-3 py-2">
              <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
                {formatTime(item.createdAt)}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', item.isReversed && 'line-through')}>
                  {activityLabel(item)}
                </p>
                {sub && <p className="text-muted-foreground truncate text-xs">{sub}</p>}
              </div>
              <span
                className={cn(
                  'shrink-0 text-sm tabular-nums',
                  reversal && 'text-muted-foreground',
                  item.isReversed && 'line-through',
                )}
              >
                {formatCents(item.amountCents)}
              </span>
              {canReverse(item) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Estornar ${activityLabel(item).toLowerCase()}`}
                  title="Estornar"
                  onClick={() => onReverse(item)}
                >
                  ↩️
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <Pager
        page={page}
        total={activity.data.total}
        pageSize={TABLE_PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
}
