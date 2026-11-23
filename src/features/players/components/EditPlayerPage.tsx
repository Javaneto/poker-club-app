import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/toastStore';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import type { Player } from '../api/playersApi';
import { usePlayer, useUpdatePlayer } from '../api/usePlayers';
import { canManagePlayers } from '../domain/permissions';
import { formatCpf, formatPhone } from '../domain/players';
import type { PlayerFormInput } from '../schemas';
import { NoPlayerPermission } from './NoPlayerPermission';
import { PlayerForm } from './PlayerForm';

function toFormValues(player: Player): PlayerFormInput {
  return {
    fullName: player.fullName,
    nickname: player.nickname ?? '',
    phone: player.phone ? formatPhone(player.phone) : '',
    cpf: player.cpf ? formatCpf(player.cpf) : '',
    email: player.email ?? '',
    birthDate: player.birthDate ?? '',
    notes: player.notes ?? '',
  };
}

export function EditPlayerPage() {
  const { playerId = '' } = useParams();
  const { club } = useActiveClub();
  const navigate = useNavigate();
  const player = usePlayer(club.id, playerId);
  const update = useUpdatePlayer(club.id, playerId);

  if (!canManagePlayers(club.role)) return <NoPlayerPermission />;
  if (player.isPending) return <p className="text-muted-foreground">Carregando…</p>;
  if (!player.data) {
    return (
      <p>
        Jogador não encontrado.{' '}
        <Link to="/jogadores" className="text-primary underline">
          Voltar
        </Link>
      </p>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar jogador</h1>
      <PlayerForm
        defaultValues={toFormValues(player.data)}
        submitLabel="Salvar"
        pending={update.isPending}
        onCancel={() => navigate(-1)}
        onSubmit={(data) =>
          update.mutate(data, {
            onSuccess: () => {
              toast.success('Dados salvos.');
              navigate(`/jogadores/${playerId}`, { replace: true });
            },
          })
        }
      />
    </section>
  );
}
