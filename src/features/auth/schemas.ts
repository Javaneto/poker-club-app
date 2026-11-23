import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail')
  .pipe(z.email({ message: 'E-mail inválido' }))
  .transform((value) => value.toLowerCase());

const newPassword = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres').max(72);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
});
export type LoginInput = z.input<typeof loginSchema>;
export type LoginData = z.output<typeof loginSchema>;

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Informe seu nome').max(120),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpData = z.output<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ForgotPasswordData = z.output<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

/** Só aceita caminhos internos em ?next= (evita redirecionar para outro site). */
export function safeNextPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  return value;
}
