import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatDateTime, formatTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import type { LedgerEntry } from '../api/ledgerApi';
import { ENTRY_KIND_LABELS, PAYMENT_METHOD_LABELS } from '../domain/result';
import { BalanceText } from './BalanceText';

export interface EntryRowProps {
  entry: LedgerEntry;
  /** Nome do jogador (quando a lista mistura jogadores). */
  playerName?: string;
  /** Mostra a data inteira em vez de só a hora. */
  showDate?: boolean;
  actions?: ReactNode;
}

export function EntryRow({ entry, playerName, showDate = false, actions }: EntryRowProps) {
  const reversed = entry.reversedById !== null;
  const details = [
    entry.paidUpfront ? 'pago na hora' : null,
    entry.paymentMethod ? PAYMENT_METHOD_LABELS[entry.paymentMethod] : null,
    entry.kind === 'buy_in' || entry.kind === 'tournament_entry'
      ? entry.paidUpfront
        ? null
        : 'fiado'
      : null,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2',
        reversed && 'opacity-60',
      )}
    >
      <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums sm:text-sm">
        {showDate ? formatDateTime(entry.createdAt) : formatTime(entry.createdAt)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', reversed && 'line-through')}>
          {playerName && <span>{playerName} · </span>}
          {ENTRY_KIND_LABELS[entry.kind]} {formatCents(entry.amountCents)}
        </p>
        {(details.length > 0 || entry.note) && (
          <p className="text-muted-foreground truncate text-xs">
            {details.join(' · ')}
            {entry.note && `${details.length > 0 ? ' · ' : ''}“${entry.note}”`}
          </p>
        )}
      </div>
      {reversed && <Badge tone="warning">estornado</Badge>}
      <BalanceText cents={entry.effectCents} className="text-sm" />
      {actions}
    </li>
  );
}
