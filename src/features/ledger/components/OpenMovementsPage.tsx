import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { normalizeSearch } from '@/features/players/domain/players';
import { formatCents } from '@/lib/money';
import type { OpenSession } from '../api/ledgerApi';
import {
  useCloseAllSessions,
  useCloseSession,
  useLedgerRealtime,
  useOpenSessions,
} from '../api/useLedger';
import { canOperateLedger } from '../domain/permissions';
import { BalanceText } from './BalanceText';
import { EntryRow } from './EntryRow';
import { MovementModal } from './MovementModal';
import { PlayerPicker } from './PlayerPicker';

/** Movimentações em aberto: todos os jogadores com sessão aberta (cash + torneio), ao vivo. */
export function OpenMovementsPage() {
  const { club } = useActiveClub();
  useLedgerRealtime(club.id);
  const sessions = useOpenSessions(club.id);
  const closeSession = useCloseSession(club.id);
  const closeAll = useCloseAllSessions(club.id);
  const canOperate = canOperateLedger(club.role);
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [closing, setClosing] = useState<OpenSession | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const visible = useMemo(() => {
    const term = normalizeSearch(search);
    const list = sessions.data ?? [];
    if (!term) return list;
    return list.filter((session) =>
      normalizeSearch(`${session.playerName} ${session.playerNickname ?? ''}`).includes(term),
    );
  }, [sessions.data, search]);

  const totalOpen = (sessions.data ?? []).reduce((sum, session) => sum + session.resultCents, 0);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Movimentações em aberto</h1>
          <p className="text-muted-foreground text-sm">
            {sessions.data ? `${sessions.data.length} em jogo · total ` : 'Carregando…'}
            {sessions.data && <BalanceText cents={totalOpen} />}
          </p>
        </div>
        {canOperate && (
          <div className="flex gap-2">
            {(sessions.data?.length ?? 0) > 0 && (
              <Button variant="secondary" onClick={() => setConfirmAll(true)}>
                Finalizar todos
              </Button>
            )}
            <Button onClick={() => setPicking(true)}>Lançar</Button>
          </div>
        )}
      </header>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filtrar por jogador"
        aria-label="Filtrar por jogador"
        className="border-border bg-surface focus-visible:ring-ring h-10 rounded-lg border px-3 focus-visible:ring-2 focus-visible:outline-none"
      />

      {sessions.isError && (
        <p className="text-danger">Não foi possível carregar as movimentações.</p>
      )}
      {sessions.data?.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          Nenhum jogador com movimentação em aberto.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((session) => (
          <article key={session.id} className="border-border bg-surface rounded-lg border">
            <header className="flex items-center gap-2 border-b px-3 py-2">
              <Link
                to={`/jogadores/${session.playerId}`}
                className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline"
              >
                {session.playerName}
                {session.playerNickname && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {session.playerNickname}
                  </span>
                )}
              </Link>
              <BalanceText cents={session.resultCents} verbose />
            </header>
            <ul className="divide-border divide-y">
              {session.entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </ul>
            {canOperate && (
              <footer className="flex gap-2 border-t p-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setTarget({ id: session.playerId, name: session.playerName })}
                >
                  Lançar
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => setClosing(session)}>
                  Finalizar
                </Button>
              </footer>
            )}
          </article>
        ))}
      </div>

      <PlayerPicker
        clubId={club.id}
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(player) => {
          setPicking(false);
          setTarget(player);
        }}
      />
      <MovementModal clubId={club.id} player={target} onClose={() => setTarget(null)} />

      <Modal
        open={closing !== null}
        onClose={() => setClosing(null)}
        title="Finalizar sessão?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={closeSession.isPending}
              onClick={() =>
                closing &&
                closeSession.mutate(closing.id, {
                  onSuccess: () => {
                    toast.success('Sessão finalizada.');
                    setClosing(null);
                  },
                })
              }
            >
              Finalizar
            </Button>
          </>
        }
      >
        {closing && (
          <p>
            {closing.playerName} fecha a noite com{' '}
            <BalanceText cents={closing.resultCents} verbose />. O valor fica no saldo do jogador.
          </p>
        )}
      </Modal>

      <Modal
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Finalizar todas as sessões?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAll(false)}>
              Cancelar
            </Button>
            <Button
              disabled={closeAll.isPending}
              onClick={() =>
                closeAll.mutate(undefined, {
                  onSuccess: (count) => {
                    toast.success(
                      `${count} ${count === 1 ? 'sessão finalizada' : 'sessões finalizadas'}.`,
                    );
                    setConfirmAll(false);
                  },
                })
              }
            >
              Finalizar todas
            </Button>
          </>
        }
      >
        <p>
          Todas as sessões abertas do clube serão finalizadas agora (inclusive as lançadas em outros
          aparelhos). Total em aberto: {formatCents(totalOpen)}.
        </p>
      </Modal>
    </section>
  );
}
