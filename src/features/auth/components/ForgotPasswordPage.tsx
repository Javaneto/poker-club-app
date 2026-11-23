import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRequestPasswordReset } from '../api/useAuthMutations';
import {
  forgotPasswordSchema,
  type ForgotPasswordData,
  type ForgotPasswordInput,
} from '../schemas';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const request = useRequestPasswordReset();
  const form = useForm<ForgotPasswordInput, unknown, ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const footer = (
    <Link to="/entrar" className="text-primary font-medium underline">
      Voltar para o login
    </Link>
  );

  if (request.isSuccess) {
    return (
      <AuthLayout
        title="Verifique seu e-mail"
        description="Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha."
        footer={footer}
      >
        <p className="text-muted-foreground text-sm">
          O link vale por pouco tempo. Confira o spam.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Esqueci minha senha"
      description="Informe seu e-mail para receber o link de redefinição."
      footer={footer}
    >
      <form
        onSubmit={form.handleSubmit((data) => request.mutate(data.email))}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Button type="submit" size="lg" disabled={request.isPending}>
          {request.isPending ? 'Enviando…' : 'Enviar link'}
        </Button>
      </form>
    </AuthLayout>
  );
}
