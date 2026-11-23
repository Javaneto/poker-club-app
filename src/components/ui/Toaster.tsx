import { cn } from '@/lib/cn';
import { useToastStore, type ToastTone } from './toastStore';

const tones: Record<ToastTone, string> = {
  info: 'border-border',
  success: 'border-success',
  error: 'border-danger',
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-end"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'bg-surface pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm shadow-lg',
            tones[item.tone],
          )}
        >
          <span className="flex-1">{item.message}</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => dismiss(item.id)}
            className="text-muted-foreground hover:bg-muted h-10 w-10 shrink-0 rounded-lg"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
