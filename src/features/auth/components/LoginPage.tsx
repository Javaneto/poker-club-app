import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSignIn } from '../api/useAuthMutations';
import { loginSchema, safeNextPath, type LoginData, type LoginInput } from '../schemas';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './authContext';

export function LoginPage() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get('next'));
  const signIn = useSignIn();

  const form = useForm<LoginInput, unknown, LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (session) return <Navigate to={next} replace />;

  const onSubmit = form.handleSubmit((data) =>
    signIn.mutate(data, { onSuccess: () => navigate(next, { replace: true }) }),
  );

  const nextQuery = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <AuthLayout
      title="Entrar"
      footer={
        <>
          Não tem conta?{' '}
          <Link to={`/cadastro${nextQuery}`} className="text-primary font-medium underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" disabled={signIn.isPending}>
          {signIn.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link to="/esqueci-senha" className="text-muted-foreground text-center text-sm underline">
          Esqueci minha senha
        </Link>
      </form>
    </AuthLayout>
  );
}
