import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toastStore';
import { useSignOut } from '@/features/auth/api/useAuthMutations';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useAuth } from '@/features/auth/components/authContext';
import { useActiveClubStore } from '../activeClubStore';
import { useCreateClub, useMyClubs } from '../api/useClubs';
import { createClubSchema, type CreateClubInput } from '../schemas';

/** Onboarding: cria o primeiro (ou mais um) clube; quem cria vira dono. */
export function CreateClubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createClub = useCreateClub();
  const signOut = useSignOut();
  const select = useActiveClubStore((state) => state.select);
  const myClubs = useMyClubs(user?.id);
  const hasClubs = (myClubs.data?.length ?? 0) > 0;

  const form = useForm<CreateClubInput>({
    resolver: zodResolver(createClubSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = form.handleSubmit(({ name }) =>
    createClub.mutate(name.trim(), {
      onSuccess: (clubId) => {
        if (user) select(user.id, clubId);
        toast.success('Clube criado.');
        navigate('/', { replace: true });
      },
    }),
  );

  return (
    <AuthLayout
      title={hasClubs ? 'Novo clube' : 'Crie seu clube'}
      description="Você será o dono e poderá convidar sua equipe depois."
      footer={
        hasClubs ? (
          <Link to="/" className="text-primary font-medium underline">
            Voltar
          </Link>
        ) : (
          <span className="text-muted-foreground">
            Recebeu um convite? Abra o link enviado pelo dono do clube.{' '}
            <button type="button" className="underline" onClick={() => signOut.mutate()}>
              Sair
            </button>
          </span>
        )
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Nome do clube"
          autoComplete="organization"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Button type="submit" size="lg" disabled={createClub.isPending}>
          {createClub.isPending ? 'Criando…' : 'Criar clube'}
        </Button>
      </form>
    </AuthLayout>
  );
}
