import { normalizeSearch, onlyDigits } from './players';

/**
 * Prepara o texto digitado para buscar em `search_text`.
 * Se parece telefone/CPF (só dígitos e pontuação), usa só os dígitos — o banco guarda sem máscara.
 * Retorna null quando não há o que buscar.
 */
export function toSearchTerm(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (/^[\d\s().+-]+$/.test(trimmed)) {
    const digits = onlyDigits(trimmed);
    return digits === '' ? null : digits;
  }
  return normalizeSearch(trimmed);
}

/** Escapa curingas do LIKE para buscar o texto literal. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export const PLAYER_PAGE_SIZE = 25;

/** Intervalo [from, to] (inclusivo) de uma página, para `.range()` do PostgREST. */
export function pageRange(page: number, pageSize = PLAYER_PAGE_SIZE): [number, number] {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export function pageCount(total: number, pageSize = PLAYER_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
