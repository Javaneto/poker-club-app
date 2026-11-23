import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { PlayerAccountPanel } from '@/features/ledger/components/PlayerAccountPanel';
import { formatDate, toLocalDateKey } from '@/lib/dates';
import { useDeletePlayer, usePlayer, useSetPlayerActive } from '../api/usePlayers';
import { canDeletePlayers, canManagePlayers } from '../domain/permissions';
import { ageOn, formatCpf, formatIsoDate, formatPhone, whatsappLink } from '../domain/players';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}

export function PlayerDetailPage() {
  const { playerId = '' } = useParams();
  const { club } = useActiveClub();
  const navigate = useNavigate();
  const player = usePlayer(club.id, playerId);
  const setActive = useSetPlayerActive(club.id, playerId);
  const remove = useDeletePlayer(club.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (player.isPending) return <p className="text-muted-foreground">Carregando…</p>;
  if (!player.data) {
    return (
      <p>
        Jogador não encontrado.{' '}
        <Link to="/jogadores" className="text-primary underline">
          Voltar para a lista
        </Link>
      </p>
    );
  }

  const data = player.data;
  const today = toLocalDateKey(new Date());

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link to="/jogadores" className="text-muted-foreground text-sm underline">
          ‹ Jogadores
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{data.fullName}</h1>
          {data.nickname && <span className="text-muted-foreground">· {data.nickname}</span>}
          {!data.active && <Badge>Inativo</Badge>}
        </div>
      </div>

      {canManagePlayers(club.role) && (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/jogadores/${data.id}/editar`}
            className="border-border bg-surface hover:bg-muted inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Editar
          </Link>
          <Button
            variant="secondary"
            disabled={setActive.isPending}
            onClick={() =>
              setActive.mutate(!data.active, {
                onSuccess: () =>
                  toast.success(data.active ? 'Jogador inativado.' : 'Jogador reativado.'),
              })
            }
          >
            {data.active ? 'Inativar' : 'Reativar'}
          </Button>
          {canDeletePlayers(club.role) && (
            <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
              Excluir
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <dl className="border-border bg-surface grid gap-3 rounded-lg border p-4">
          <Field label="Telefone">
            {data.phone ? (
              <span className="flex flex-wrap items-center gap-2">
                <a href={`tel:${data.phone}`} className="underline">
                  {formatPhone(data.phone)}
                </a>
                <a
                  href={whatsappLink(data.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm underline"
                >
                  WhatsApp
                </a>
              </span>
            ) : (
              '—'
            )}
          </Field>
          <Field label="CPF">{data.cpf ? formatCpf(data.cpf) : '—'}</Field>
          <Field label="E-mail">{data.email ?? '—'}</Field>
          <Field label="Nascimento">
            {data.birthDate
              ? `${formatIsoDate(data.birthDate)} (${ageOn(data.birthDate, today)} anos)`
              : '—'}
          </Field>
          <Field label="Observação">
            <span className="whitespace-pre-line">{data.notes ?? '—'}</span>
          </Field>
          <Field label="Cadastrado em">{formatDate(data.createdAt)}</Field>
        </dl>

        <PlayerAccountPanel player={data} />
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir jogador?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(data.id, {
                  onSuccess: () => {
                    toast.success('Jogador excluído.');
                    navigate('/jogadores', { replace: true });
                  },
                })
              }
            >
              Excluir
            </Button>
          </>
        }
      >
        <p>
          {data.fullName} será excluído definitivamente. Jogadores com lançamentos não podem ser
          excluídos — use <strong>Inativar</strong> para tirar da lista mantendo o histórico.
        </p>
      </Modal>
    </section>
  );
}
