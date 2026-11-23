import { Button } from '@/components/ui/Button';

export interface PagerProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pager({ page, total, pageSize, onChange }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </Button>
      <span className="text-muted-foreground text-sm">
        Página {page} de {pages}
      </span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Próxima
      </Button>
    </nav>
  );
}
