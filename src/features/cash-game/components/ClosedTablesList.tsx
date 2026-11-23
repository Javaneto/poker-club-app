import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pager } from '@/features/ledger/components/Pager';
import { formatDateTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { TABLE_PAGE_SIZE } from '../api/cashGameApi';
import { useClosedTables } from '../api/useCashGame';
import { formatBlinds } from '../domain/chips';

export function ClosedTablesList({ clubId }: { clubId: string }) {
  const [page, setPage] = useState(1);
  const tables = useClosedTables(clubId, page);

  if (tables.isPending) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (tables.isError) return <p className="text-danger text-sm">Não foi possível carregar.</p>;
  if (tables.data.total === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma mesa encerrada ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {tables.data.items.map((table) => (
          <li key={table.id}>
            <Link
              to={`/mesas/${table.id}`}
              className="hover:bg-muted/50 flex min-h-11 flex-col justify-center px-3 py-2"
            >
              <span className="text-sm font-medium">
                {table.name} ·{' '}
                {formatBlinds(table.smallBlindCents, table.bigBlindCents, formatCents)}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(table.openedAt)} →{' '}
                {table.closedAt ? formatDateTime(table.closedAt) : '—'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={page} total={tables.data.total} pageSize={TABLE_PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
