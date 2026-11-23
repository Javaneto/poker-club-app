import { createContext, useContext } from 'react';
import type { Session } from '../api/authApi';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthState {
  session: Session | null;
  user: AuthUser | null;
  /** Lendo a sessão salva na inicialização. */
  loading: boolean;
  /** Entrou pelo link de "esqueci minha senha". */
  recovering: boolean;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return value;
}
