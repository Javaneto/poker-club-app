import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Diálogo modal: bottom sheet no celular, centralizado a partir de `sm`. */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'bg-surface relative flex max-h-[90dvh] w-full flex-col shadow-xl outline-none',
          'rounded-t-2xl pb-[env(safe-area-inset-bottom)]',
          'sm:max-w-lg sm:rounded-2xl sm:pb-0',
        )}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-2">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="border-border flex justify-end gap-2 border-t px-4 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
