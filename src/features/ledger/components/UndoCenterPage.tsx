import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { AuditLogList } from '@/features/audit/components/AuditLogList';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { canViewAuditLog } from '@/features/clubs/domain/roles';
import { LEDGER_PAGE_SIZE, type LedgerEntry } from '../api/ledgerApi';
import { useLedgerRealtime, useOpenEntries } from '../api/useLedger';
import { canOperateLedger, canReopenSessions } from '../domain/permissions';
import { ClosedSessionsList } from './ClosedSessionsList';
import { EntryRow } from './EntryRow';
import { Pager } from './Pager';
import { ReverseEntryModal } from './ReverseEntryModal';

/** Central "Desfazer / Log": estornar em aberto, reabrir sessões e consultar o log. */
export function UndoCenterPage() {
  const { club } = useActiveClub();
  useLedgerRealtime(club.id);
  const [tab, setTab] = useState('open');
  const [page, setPage] = useState(1);
  const entries = useOpenEntries(club.id, page);
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);
  const canOperate = canOperateLedger(club.role);

  const items = [
    {
      value: 'open',
      label: 'Em aberto',
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Lançamentos das sessões abertas. Estornar cria um lançamento contrário; nada é apagado.
          </p>
          {entries.data?.total === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum lançamento em aberto.</p>
          )}
          {(entries.data?.items.length ?? 0) > 0 && (
            <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
              {entries.data?.items.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  playerName={entry.playerName}
                  actions={
                    canOperate && entry.kind !== 'reversal' && entry.reversedById === null ? (
                      <Button variant="ghost" onClick={() => setReversing(entry)}>
                        Estornar
                      </Button>
                    ) : null
                  }
                />
              ))}
            </ul>
          )}
          <Pager
            page={page}
            total={entries.data?.total ?? 0}
            pageSize={LEDGER_PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      ),
    },
    {
      value: 'closed',
      label: 'Sessões finalizadas',
      content: <ClosedSessionsList clubId={club.id} canReopen={canReopenSessions(club.role)} />,
    },
    ...(canViewAuditLog(club.role)
      ? [{ value: 'log', label: 'Log', content: <AuditLogList clubId={club.id} /> }]
      : []),
  ];

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Desfazer / Log</h1>
      <Tabs value={tab} onValueChange={setTab} items={items} />
      <ReverseEntryModal clubId={club.id} entry={reversing} onClose={() => setReversing(null)} />
    </section>
  );
}
