import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FieldShell } from './FieldShell';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell id={inputId} label={label} error={error}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(fieldClass, error && 'border-danger', className)}
        {...props}
      />
    </FieldShell>
  );
});

export const fieldClass =
  'h-10 rounded-lg border border-border bg-surface px-3 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
