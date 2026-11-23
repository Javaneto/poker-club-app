import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toastStore';
import { useUpdatePassword } from '../api/useAuthMutations';
import { resetPasswordSchema, type ResetPasswordInput } from '../schemas';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './authContext';

/** Destino do link de "esqueci minha senha": a sessão chega pela URL. */
export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const update = useUpdatePassword();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (loading) return null;

  if (!session) {
    return (
      <AuthLayout
        title="Link inválido ou expirado"
        description="Peça um novo link de redefinição de senha."
        footer={
          <Link to="/esqueci-senha" className="text-primary font-medium underline">
            Pedir novo link
          </Link>
        }
      >
        <span />
      </AuthLayout>
    );
  }

  const onSubmit = form.handleSubmit((data) =>
    update.mutate(data.password, {
      onSuccess: () => {
        toast.success('Senha alterada.');
        navigate('/', { replace: true });
      },
    }),
  );

  return (
    <AuthLayout title="Nova senha">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Input
          label="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <Button type="submit" size="lg" disabled={update.isPending}>
          {update.isPending ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  );
}
