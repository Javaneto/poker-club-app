/** Descrição legível (pt-BR) de uma linha do log de auditoria. */

import { ROLE_LABELS, isClubRole } from '@/features/clubs/domain/roles';
import { ENTRY_KIND_LABELS, isEntryKind } from '@/features/ledger/domain/result';
import { formatCents } from '@/lib/money';

export const AUDIT_TABLE_LABELS: Record<string, string> = {
  clubs: 'Clube',
  club_members: 'Equipe',
  club_settings: 'Configurações',
  club_invitations: 'Convites',
  players: 'Jogadores',
  player_sessions: 'Sessões',
  ledger_entries: 'Lançamentos',
};

const OPERATION_LABELS = { INSERT: 'Inclusão', UPDATE: 'Alteração', DELETE: 'Exclusão' } as const;

export function operationLabel(operation: keyof typeof OPERATION_LABELS): string {
  return OPERATION_LABELS[operation];
}

export function tableLabel(table: string): string {
  return AUDIT_TABLE_LABELS[table] ?? table;
}

const IGNORED_FIELDS = new Set(['updated_at', 'normalized_name', 'search_text']);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Campos que mudaram num UPDATE (ignora colunas técnicas). */
export function changedFields(oldData: unknown, newData: unknown): string[] {
  const before = asRecord(oldData);
  const after = asRecord(newData);
  if (!before || !after) return [];
  return Object.keys(after).filter(
    (key) => !IGNORED_FIELDS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

/** Resumo curto: lançamento (tipo + valor), nome, papel ou id abreviado. */
export function rowSummary(oldData: unknown, newData: unknown, rowId: string | null): string {
  const row = asRecord(newData) ?? asRecord(oldData);
  if (row) {
    if (isEntryKind(row.kind) && typeof row.amount_cents === 'number') {
      return `${ENTRY_KIND_LABELS[row.kind]} ${formatCents(row.amount_cents)}`;
    }
    const name = row.full_name ?? row.name ?? row.email;
    if (typeof name === 'string' && name) return name;
    if (isClubRole(row.role)) return `Papel: ${ROLE_LABELS[row.role]}`;
    if (row.status === 'open' || row.status === 'closed') {
      return row.status === 'open' ? 'Sessão aberta' : 'Sessão finalizada';
    }
  }
  if (!rowId || rowId.startsWith('{')) return '—';
  return rowId.slice(0, 8);
}
