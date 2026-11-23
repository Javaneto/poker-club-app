import { useAuth } from '@/features/auth/components/authContext';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { ROLE_LABELS } from '@/features/clubs/domain/roles';
import { BirthdaysCard } from '@/features/players/components/BirthdaysCard';

/** Início provisório. O painel completo chega na Fase 11. */
export function DashboardPage() {
  const { user } = useAuth();
  const { club } = useActiveClub();
  const firstName = (user?.fullName || '').split(' ')[0];

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{firstName ? `Olá, ${firstName}` : 'Olá'}</h1>
      <p className="text-muted-foreground">
        Você está em <strong className="text-foreground">{club.name}</strong> como{' '}
        {ROLE_LABELS[club.role].toLowerCase()}.
      </p>
      <p className="text-muted-foreground text-sm">
        Os módulos do clube (jogadores, caixa, torneios) aparecem aqui nas próximas fases.
      </p>
      <div className="mt-4">
        <BirthdaysCard />
      </div>
    </section>
  );
}
