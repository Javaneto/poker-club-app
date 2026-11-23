import type { ReactNode } from 'react';

export function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <main className="text-muted-foreground flex min-h-dvh items-center justify-center p-4 text-center">
      <p role="status">{children}</p>
    </main>
  );
}
