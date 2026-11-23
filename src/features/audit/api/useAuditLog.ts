import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAuditLog, type AuditFilters } from './auditApi';

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit', filters.clubId, filters],
    queryFn: () => fetchAuditLog(filters),
    placeholderData: keepPreviousData,
  });
}
