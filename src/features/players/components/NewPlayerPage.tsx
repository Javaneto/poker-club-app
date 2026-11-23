import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/toastStore';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { useCreatePlayer } from '../api/usePlayers';
import { canManagePlayers } from '../domain/permissions';
import { emptyPlayerForm } from '../schemas';
import { NoPlayerPermission } from './NoPlayerPermission';
import { PlayerForm } from './PlayerForm';

export function NewPlayerPage() {
  const { club } = useActiveClub();
  const navigate = useNavigate();
  const create = useCreatePlayer(club.id);

  if (!canManagePlayers(club.role)) return <NoPlayerPermission />;

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo jogador</h1>
      <PlayerForm
        defaultValues={emptyPlayerForm}
        submitLabel="Cadastrar"
        pending={create.isPending}
        onCancel={() => navigate(-1)}
        onSubmit={(data) =>
          create.mutate(data, {
            onSuccess: (player) => {
              toast.success('Jogador cadastrado.');
              navigate(`/jogadores/${player.id}`, { replace: true });
            },
          })
        }
      />
    </section>
  );
}
