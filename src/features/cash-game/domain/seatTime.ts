/** Tempo de mesa: só exibição do tempo sentado (sem cobrança). */

export interface SeatTime {
  /** Segundos de passagens já encerradas (levantou). */
  completedSeconds: number;
  /** Início do assento atual, se ainda sentado. */
  seatedAt: string | null;
}

export function secondsSeated(seat: SeatTime, now: Date): number {
  const current = seat.seatedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(seat.seatedAt).getTime()) / 1000))
    : 0;
  return seat.completedSeconds + current;
}

/** Segundos → "45 min", "2 h 05 min". */
export function formatSeatTime(totalSeconds: number): string {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
}
