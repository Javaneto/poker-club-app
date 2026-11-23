import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { LoginData, SignUpData } from '../schemas';

export type { Session };

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'OTHER';

/** Assina mudanças de sessão. Retorna a função para cancelar. */
export function onAuthChange(callback: (event: AuthEvent, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const mapped: AuthEvent =
      event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY'
        ? event
        : 'OTHER';
    callback(mapped, session);
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn({ email, password }: LoginData): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Retorna `true` se a conta já entrou logada; `false` se precisa confirmar o e-mail. */
export async function signUp({ email, password, fullName }: SignUpData): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data.session !== null;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
