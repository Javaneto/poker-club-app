import { cn } from '@/lib/cn';
import { formatCents } from '@/lib/money';
import type { TableSummary } from '../api/cashGameApi';

function Line({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={cn('flex justify-between gap-2 text-sm', className)}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatCents(value)}</dd>
    </div>
  );
}

/** Conferência: compras − devoluções − rake − capilé = fichas na mesa. */
export function TableSummaryPanel({ summary }: { summary: TableSummary }) {
  const chipsTone =
    summary.chipsCents < 0 ? 'text-danger' : summary.chipsCents === 0 ? 'text-success' : '';
  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-sm font-medium">Fichas na mesa</span>
        <span className={cn('text-3xl font-semibold tabular-nums', chipsTone)}>
          {formatCents(summary.chipsCents)}
        </span>
      </div>
      <dl className="flex flex-col gap-1">
        <Line label="Compras" value={summary.purchasesCents} />
        <Line label="− Devoluções" value={summary.returnsCents} />
        <Line label="− Rake" value={summary.rakeCents} />
        <Line label="− Capilé" value={summary.tipsCents} />
        <Line
          label="Despesas (fora da conferência)"
          value={summary.expensesCents}
          className="text-muted-foreground border-border mt-1 border-t pt-2"
        />
      </dl>
    </div>
  );
}
