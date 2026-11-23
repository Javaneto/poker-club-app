import type { ReactNode } from 'react';
import { formatCents } from '@/lib/money';
import type { CashSummary } from '../api/cashApi';

function Line({
  label,
  value,
  strong = false,
}: {
  label: ReactNode;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? 'text-base font-semibold' : 'text-sm'}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatCents(value)}</dd>
    </div>
  );
}

/** Conferência do dinheiro físico + totais informativos por forma de pagamento. */
export function CashSummaryPanel({ summary }: { summary: CashSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <dl className="border-border bg-surface flex flex-col gap-1 rounded-lg border p-4">
        <p className="text-muted-foreground mb-1 text-sm font-medium">Dinheiro na gaveta</p>
        <Line label="Abertura" value={summary.openingCents} />
        <Line label="+ Entradas em dinheiro" value={summary.cashInCents} />
        <Line label="− Saídas em dinheiro" value={summary.cashOutCents} />
        <Line label="+ Suprimentos" value={summary.depositsCents} />
        <Line label="− Sangrias" value={summary.withdrawalsCents} />
        <div className="border-border mt-1 border-t pt-2">
          <Line label="Esperado em dinheiro" value={summary.expectedCashCents} strong />
        </div>
      </dl>
      <div className="border-border bg-surface rounded-lg border p-4">
        <p className="text-muted-foreground mb-2 text-sm font-medium">Por forma de pagamento</p>
        {summary.byMethod.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum recebimento ou pagamento ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="font-normal">Forma</th>
                <th className="text-right font-normal">Entradas</th>
                <th className="text-right font-normal">Saídas</th>
              </tr>
            </thead>
            <tbody>
              {summary.byMethod.map((method) => (
                <tr key={method.paymentMethodId ?? method.name}>
                  <td className="py-1">{method.name}</td>
                  <td className="py-1 text-right tabular-nums">{formatCents(method.inCents)}</td>
                  <td className="py-1 text-right tabular-nums">{formatCents(method.outCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-muted-foreground mt-2 text-xs">
          Só o dinheiro físico é conferido no fechamento. PIX e cartões são informativos.
        </p>
      </div>
    </div>
  );
}
