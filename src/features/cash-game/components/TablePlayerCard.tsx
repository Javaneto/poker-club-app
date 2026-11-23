import { Button } from '@/components/ui/Button';
import { BalanceText } from '@/features/ledger/components/BalanceText';
import { formatCents } from '@/lib/money';
import type { TablePlayer } from '../api/cashGameApi';
import { playerTableResult } from '../domain/chips';
import { formatSeatTime, secondsSeated } from '../domain/seatTime';

export interface TablePlayerCardProps {
  player: TablePlayer;
  now: Date;
  /** Sem ações quando a mesa está encerrada ou o papel não opera. */
  actions?: {
    onBuy: () => void;
    onCashOut: () => void;
    onUnseat: () => void;
  };
}

export function TablePlayerCard({ player, now, actions }: TablePlayerCardProps) {
  const seated = player.seatId !== null;
  return (
    <li className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate font-medium">
          {player.fullName}
          {player.nickname && <span className="text-muted-foreground"> · {player.nickname}</span>}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {seated ? '🟢 ' : ''}
          {formatSeatTime(secondsSeated(player, now))}
        </span>
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          Compras{' '}
          <strong className="text-foreground tabular-nums">{formatCents(player.buyInCents)}</strong>
        </span>
        <span>
          Devoluções{' '}
          <strong className="text-foreground tabular-nums">
            {formatCents(player.cashOutCents)}
          </strong>
        </span>
        {!seated && (
          <span>
            Resultado <BalanceText cents={playerTableResult(player)} />
          </span>
        )}
      </div>
      {seated && actions && (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={actions.onBuy}>
            Compra
          </Button>
          <Button variant="secondary" onClick={actions.onCashOut}>
            Devolver
          </Button>
          <Button variant="ghost" onClick={actions.onUnseat}>
            Levantar
          </Button>
        </div>
      )}
    </li>
  );
}
