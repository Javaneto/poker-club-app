import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = items[(index + delta + items.length) % items.length];
    if (!next) return;
    onValueChange(next.value);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  }

  const active = items.find((item) => item.value === value);

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        className="border-border flex gap-1 overflow-x-auto border-b"
      >
        {items.map((item, index) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              data-value={item.value}
              onClick={() => onValueChange(item.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'h-10 shrink-0 border-b-2 px-4 text-sm font-medium',
                selected
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground border-transparent',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.value}`}
          aria-labelledby={`${baseId}-tab-${active.value}`}
          className="pt-4"
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
