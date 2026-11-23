import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Moldura das telas públicas (login, cadastro, senha, convite). */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <p className="text-primary mb-6 text-center text-sm font-semibold tracking-wide uppercase">
          Clube de Poker
        </p>
        <div className="border-border bg-surface rounded-2xl border p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
      </div>
    </main>
  );
}
