import { ENTRY_KIND_LABELS } from '@/features/ledger/domain/result';
import { BalanceText } from '@/features/ledger/components/BalanceText';
import { formatTime } from '@/lib/dates';
import type { CashTimelineItem } from '../api/cashApi';

const MOVEMENT_LABELS = { withdrawal: 'Sangria', deposit: 'Suprimento' } as const;

/** Tudo que mexeu no caixa, em ordem: lançamentos com dinheiro e sangrias/suprimentos. */
export function CashTimeline({ items }: { items: CashTimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma movimentação neste caixa ainda.</p>;
  }
  return (
    <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-3 py-2">
          <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums sm:text-sm">
            {formatTime(item.createdAt)}
          </span>
          <div className="min-w-0 flex-1">
            {item.type === 'entry' ? (
              <>
                <p className="truncate text-sm font-medium">
                  {item.playerName} · {ENTRY_KIND_LABELS[item.kind]}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {item.methodName}
                  {item.note && ` · “${item.note}”`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">{MOVEMENT_LABELS[item.kind]}</p>
                {item.note && (
                  <p className="text-muted-foreground truncate text-xs">“{item.note}”</p>
                )}
              </>
            )}
          </div>
          <BalanceText
            className="text-sm"
            cents={
              item.type === 'entry'
                ? item.cashFlowCents
                : item.kind === 'deposit'
                  ? item.amountCents
                  : -item.amountCents
            }
          />
        </li>
      ))}
    </ul>
  );
}
