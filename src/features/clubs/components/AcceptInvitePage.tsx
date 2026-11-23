import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toastStore';
import { useSignOut } from '@/features/auth/api/useAuthMutations';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useAuth } from '@/features/auth/components/authContext';
import { useActiveClubStore } from '../activeClubStore';
import { useAcceptInvitation, useInvitationPreview } from '../api/useClubs';
import { ROLE_LABELS } from '../domain/roles';

const STATUS_MESSAGES = {
  accepted: 'Este convite já foi usado.',
  revoked: 'Este convite foi cancelado pelo dono do clube.',
  expired: 'Este convite expirou. Peça um novo ao dono do clube.',
} as const;

/** /convite/:token — a pessoa precisa estar logada com o e-mail convidado. */
export function AcceptInvitePage() {
  const { token = '' } = useParams();
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const select = useActiveClubStore((state) => state.select);
  const preview = useInvitationPreview(token, Boolean(session));
  const accept = useAcceptInvitation();
  const signOut = useSignOut();
  const next = encodeURIComponent(`/convite/${token}`);

  if (loading) return null;

  if (!session) {
    return (
      <AuthLayout
        title="Você recebeu um convite"
        description="Entre ou crie sua conta com o e-mail que recebeu o convite para continuar."
      >
        <div className="flex flex-col gap-2">
          <Link
            to={`/cadastro?next=${next}`}
            className="bg-primary text-primary-foreground flex h-12 items-center justify-center rounded-lg font-medium"
          >
            Criar conta
          </Link>
          <Link
            to={`/entrar?next=${next}`}
            className="border-border flex h-12 items-center justify-center rounded-lg border font-medium"
          >
            Já tenho conta
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (preview.isPending) return <AuthLayout title="Carregando convite…">{null}</AuthLayout>;

  const invitation = preview.data;
  if (!invitation) {
    return (
      <AuthLayout title="Convite não encontrado" description="Confira se o link está completo.">
        <Link to="/" className="text-primary font-medium underline">
          Ir para o início
        </Link>
      </AuthLayout>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <AuthLayout title={invitation.clubName} description={STATUS_MESSAGES[invitation.status]}>
        <Link to="/" className="text-primary font-medium underline">
          Ir para o início
        </Link>
      </AuthLayout>
    );
  }

  const wrongAccount = user?.email.toLowerCase() !== invitation.email;

  return (
    <AuthLayout
      title={`Entrar em ${invitation.clubName}`}
      description={`Você foi convidado como ${ROLE_LABELS[invitation.role].toLowerCase()}.`}
    >
      {wrongAccount ? (
        <div className="flex flex-col gap-3 text-sm">
          <p>
            Este convite é para <strong>{invitation.email}</strong>, mas você entrou como{' '}
            <strong>{user?.email}</strong>.
          </p>
          <Button variant="secondary" onClick={() => signOut.mutate()}>
            Sair e entrar com outra conta
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full"
          disabled={accept.isPending}
          onClick={() =>
            accept.mutate(token, {
              onSuccess: (clubId) => {
                if (user) select(user.id, clubId);
                toast.success(`Bem-vindo ao ${invitation.clubName}!`);
                navigate('/', { replace: true });
              },
            })
          }
        >
          {accept.isPending ? 'Entrando…' : 'Aceitar convite'}
        </Button>
      )}
    </AuthLayout>
  );
}
