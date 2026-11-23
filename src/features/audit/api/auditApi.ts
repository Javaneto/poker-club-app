import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

export interface AuditEntry {
  id: number;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  rowId: string | null;
  oldData: Json | null;
  newData: Json | null;
  userId: string | null;
  createdAt: string;
}

export interface AuditFilters {
  clubId: string;
  table: string;
  operation: '' | 'INSERT' | 'UPDATE' | 'DELETE';
  /** Datas civis "AAAA-MM-DD" (inclusivas), no fuso do aparelho. */
  from: string;
  to: string;
  page: number;
}

export const AUDIT_PAGE_SIZE = 30;

function isOperation(value: string): value is AuditEntry['operation'] {
  return value === 'INSERT' || value === 'UPDATE' || value === 'DELETE';
}

/** Log de auditoria do clube (RLS: só dono e gerente leem). */
export async function fetchAuditLog(
  filters: AuditFilters,
): Promise<{ items: AuditEntry[]; total: number }> {
  const from = (Math.max(1, filters.page) - 1) * AUDIT_PAGE_SIZE;
  let query = supabase
    .from('audit_log')
    .select('id, table_name, operation, row_id, old_data, new_data, user_id, created_at', {
      count: 'exact',
    })
    .eq('club_id', filters.clubId);

  if (filters.table) query = query.eq('table_name', filters.table);
  if (filters.operation) query = query.eq('operation', filters.operation);
  if (filters.from)
    query = query.gte('created_at', new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to)
    query = query.lte('created_at', new Date(`${filters.to}T23:59:59.999`).toISOString());

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);
  if (error) throw error;

  return {
    items: data.map((row) => ({
      id: row.id,
      tableName: row.table_name,
      operation: isOperation(row.operation) ? row.operation : 'UPDATE',
      rowId: row.row_id,
      oldData: row.old_data,
      newData: row.new_data,
      userId: row.user_id,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}
