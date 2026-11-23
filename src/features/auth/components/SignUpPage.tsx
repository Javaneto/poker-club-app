import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSignUp } from '../api/useAuthMutations';
import { safeNextPath, signUpSchema, type SignUpData, type SignUpInput } from '../schemas';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './authContext';

export function SignUpPage() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get('next'));
  const signUp = useSignUp();
  const [confirmEmailFor, setConfirmEmailFor] = useState<string | null>(null);

  const form = useForm<SignUpInput, unknown, SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  if (session) return <Navigate to={next} replace />;

  if (confirmEmailFor) {
    return (
      <AuthLayout
        title="Confirme seu e-mail"
        description={`Enviamos um link para ${confirmEmailFor}. Abra o e-mail e clique no link para ativar sua conta.`}
        footer={
          <Link to="/entrar" className="text-primary font-medium underline">
            Voltar para o login
          </Link>
        }
      >
        <p className="text-muted-foreground text-sm">
          Não chegou? Confira a caixa de spam ou tente se cadastrar de novo em alguns minutos.
        </p>
      </AuthLayout>
    );
  }

  const onSubmit = form.handleSubmit((data) =>
    signUp.mutate(data, {
      onSuccess: (signedIn) => {
        if (signedIn) navigate(next, { replace: true });
        else setConfirmEmailFor(data.email);
      },
    }),
  );

  const nextQuery = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';
  const errors = form.formState.errors;

  return (
    <AuthLayout
      title="Criar conta"
      footer={
        <>
          Já tem conta?{' '}
          <Link to={`/entrar${nextQuery}`} className="text-primary font-medium underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Seu nome"
          autoComplete="name"
          error={errors.fullName?.message}
          {...form.register('fullName')}
        />
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Input
          label="Confirme a senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <Button type="submit" size="lg" disabled={signUp.isPending}>
          {signUp.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  );
}
