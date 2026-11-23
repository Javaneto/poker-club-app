/**
 * Datas: o banco guarda `timestamptz` (UTC). A exibição é sempre no fuso do clube,
 * por padrão America/Sao_Paulo, independente do fuso do aparelho.
 */

export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Data inválida: ${String(value)}`);
  return date;
}

function formatter(options: Intl.DateTimeFormatOptions, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, ...options });
}

/** "22/11/2026" */
export function formatDate(value: DateInput, timeZone = DEFAULT_TIME_ZONE): string {
  return formatter({ day: '2-digit', month: '2-digit', year: 'numeric' }, timeZone).format(
    toDate(value),
  );
}

/** "21:30" */
export function formatTime(value: DateInput, timeZone = DEFAULT_TIME_ZONE): string {
  return formatter({ hour: '2-digit', minute: '2-digit', hour12: false }, timeZone).format(
    toDate(value),
  );
}

/** "22/11/2026 21:30" */
export function formatDateTime(value: DateInput, timeZone = DEFAULT_TIME_ZONE): string {
  return `${formatDate(value, timeZone)} ${formatTime(value, timeZone)}`;
}

/** Dia civil no fuso do clube, no formato ISO "2026-11-22" (útil para agrupar e filtrar). */
export function toLocalDateKey(value: DateInput, timeZone = DEFAULT_TIME_ZONE): string {
  const parts = formatter({ day: '2-digit', month: '2-digit', year: 'numeric' }, timeZone)
    .formatToParts(toDate(value))
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Segundos → "MM:SS" ou "H:MM:SS" (relógio do torneio). Negativos viram 00:00. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
