import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Pager } from '@/features/ledger/components/Pager';
import { formatDateTime } from '@/lib/dates';
import { AUDIT_PAGE_SIZE, type AuditFilters } from '../api/auditApi';
import { useAuditLog } from '../api/useAuditLog';
import {
  AUDIT_TABLE_LABELS,
  changedFields,
  operationLabel,
  rowSummary,
  tableLabel,
} from '../domain/describe';

const OPERATION_TONE = { INSERT: 'success', UPDATE: 'warning', DELETE: 'danger' } as const;

/** Log de auditoria com filtros por área, operação e período. */
export function AuditLogList({ clubId }: { clubId: string }) {
  const [filters, setFilters] = useState<AuditFilters>({
    clubId,
    table: '',
    operation: '',
    from: '',
    to: '',
    page: 1,
  });
  const log = useAuditLog({ ...filters, clubId });

  function update(changes: Partial<AuditFilters>) {
    setFilters((current) => ({ ...current, page: 1, ...changes }));
  }

  const fieldClass = 'h-10 rounded-lg border border-border bg-surface px-2';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          Área
          <select
            className={fieldClass}
            value={filters.table}
            onChange={(event) => update({ table: event.target.value })}
          >
            <option value="">Todas</option>
            {Object.entries(AUDIT_TABLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Operação
          <select
            className={fieldClass}
            value={filters.operation}
            onChange={(event) => {
              const value = event.target.value;
              update({
                operation:
                  value === 'INSERT' || value === 'UPDATE' || value === 'DELETE' ? value : '',
              });
            }}
          >
            <option value="">Todas</option>
            <option value="INSERT">Inclusão</option>
            <option value="UPDATE">Alteração</option>
            <option value="DELETE">Exclusão</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          De
          <input
            type="date"
            className={fieldClass}
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Até
          <input
            type="date"
            className={fieldClass}
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </label>
      </div>

      {log.isError && <p className="text-danger text-sm">Não foi possível carregar o log.</p>}
      {log.data?.total === 0 && (
        <p className="text-muted-foreground text-sm">Nada registrado nesse filtro.</p>
      )}

      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {log.data?.items.map((item) => {
          const fields =
            item.operation === 'UPDATE' ? changedFields(item.oldData, item.newData) : [];
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground w-28 shrink-0 text-xs tabular-nums">
                {formatDateTime(item.createdAt)}
              </span>
              <Badge tone={OPERATION_TONE[item.operation]}>{operationLabel(item.operation)}</Badge>
              <span className="font-medium">{tableLabel(item.tableName)}</span>
              <span className="min-w-0 flex-1 truncate">
                {rowSummary(item.oldData, item.newData, item.rowId)}
                {fields.length > 0 && (
                  <span className="text-muted-foreground"> · {fields.join(', ')}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <Pager
        page={filters.page}
        total={log.data?.total ?? 0}
        pageSize={AUDIT_PAGE_SIZE}
        onChange={(page) => setFilters((current) => ({ ...current, page }))}
      />
    </div>
  );
}
