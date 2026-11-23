import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url({ message: 'VITE_SUPABASE_URL deve ser uma URL válida' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY é obrigatória'),
});

export type Env = z.infer<typeof envSchema>;

/** Valida as variáveis públicas do Vite. Falha cedo, com mensagem clara, se faltar algo no .env. */
export function parseEnv(source: Record<string, unknown>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `- ${issue.message}`).join('\n');
    throw new Error(`Configuração inválida (veja .env.example):\n${details}`);
  }
  return result.data;
}
