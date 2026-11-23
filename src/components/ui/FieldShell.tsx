import type { ReactNode } from 'react';

export interface FieldShellProps {
  id: string;
  label?: string;
  error?: string;
  children: ReactNode;
}

/** Rótulo + campo + mensagem de erro, compartilhado por Input e Select. */
export function FieldShell({ id, label, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
