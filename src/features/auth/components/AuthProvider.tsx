import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from '@/components/ui/toastStore';
import { toFriendlyMessage } from '@/lib/errors';
import { getSession, onAuthChange, type Session } from '../api/authApi';
import { AuthContext, type AuthState } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;
    getSession()
      .then((current) => {
        if (active) setSession(current);
      })
      .catch((error: unknown) => {
        console.error(error);
        toast.error(toFriendlyMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = onAuthChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session
        ? {
            id: session.user.id,
            email: session.user.email ?? '',
            fullName: readFullName(session.user.user_metadata),
          }
        : null,
      loading,
      recovering,
    }),
    [session, loading, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function readFullName(metadata: unknown): string {
  if (typeof metadata === 'object' && metadata !== null && 'full_name' in metadata) {
    const value: unknown = (metadata as Record<string, unknown>).full_name;
    if (typeof value === 'string') return value;
  }
  return '';
}
