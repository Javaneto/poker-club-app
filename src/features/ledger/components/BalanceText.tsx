import { cn } from '@/lib/cn';
import { formatCents } from '@/lib/money';

export interface BalanceTextProps {
  cents: number;
  className?: string;
  /** Mostra "deve"/"crédito" em vez de só o sinal. */
  verbose?: boolean;
}

/** Valor do ponto de vista do jogador: negativo = deve ao clube; positivo = tem crédito. */
export function BalanceText({ cents, className, verbose = false }: BalanceTextProps) {
  const tone = cents < 0 ? 'text-danger' : cents > 0 ? 'text-success' : 'text-muted-foreground';
  let text = formatCents(cents);
  if (verbose) {
    if (cents < 0) text = `deve ${formatCents(-cents)}`;
    else if (cents > 0) text = `crédito ${formatCents(cents)}`;
    else text = 'zerado';
  }
  return <span className={cn('font-semibold tabular-nums', tone, className)}>{text}</span>;
}
