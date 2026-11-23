import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toastStore';
import { useOpenCash } from '../api/useCash';
import { openCashSchema, type OpenCashData, type OpenCashInput } from '../schemas';

export function OpenCashForm({ clubId }: { clubId: string }) {
  const open = useOpenCash(clubId);
  const form = useForm<OpenCashInput, unknown, OpenCashData>({
    resolver: zodResolver(openCashSchema),
    defaultValues: { opening: '' },
  });

  return (
    <form
      noValidate
      className="border-border bg-surface flex max-w-md flex-col gap-4 rounded-lg border p-4"
      onSubmit={form.handleSubmit((data) =>
        open.mutate(data.opening, { onSuccess: () => toast.success('Caixa aberto.') }),
      )}
    >
      <div>
        <h2 className="font-semibold">Caixa fechado</h2>
        <p className="text-muted-foreground text-sm">
          Informe o dinheiro que está na gaveta para abrir o caixa do dia.
        </p>
      </div>
      <Input
        label="Valor de abertura (R$)"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        error={form.formState.errors.opening?.message}
        {...form.register('opening')}
      />
      <Button type="submit" size="lg" disabled={open.isPending}>
        Abrir caixa
      </Button>
    </form>
  );
}
