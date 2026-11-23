import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { formatCents } from '@/lib/money';
import { useRecordTableEntry } from '../api/useCashGame';
import {
  exceedsChips,
  removesChips,
  TABLE_ENTRY_KIND_LABELS,
  type TableEntryKind,
} from '../domain/chips';
import { tableEntrySchema, type TableEntryFormData, type TableEntryFormInput } from '../schemas';

const HINTS: Record<TableEntryKind, string> = {
  rake: 'Fichas retiradas para o clube. Só registro: o dinheiro já entrou com as compras.',
  tip: 'Gorjeta dos dealers. Só registro; pagar os dealers em dinheiro é uma sangria no caixa.',
  expense: 'Despesa da mesa (lanche, baralho…). Só registro: não mexe no caixa nem nas fichas.',
};

export interface TableEntryModalProps {
  clubId: string;
  tableId: string;
  kind: TableEntryKind | null;
  chipsOnTableCents: number;
  onClose: () => void;
}

/** Rake, capilé ou despesa da mesa. */
export function TableEntryModal({
  clubId,
  tableId,
  kind,
  chipsOnTableCents,
  onClose,
}: TableEntryModalProps) {
  const record = useRecordTableEntry(clubId, tableId);
  const form = useForm<TableEntryFormInput, unknown, TableEntryFormData>({
    resolver: zodResolver(tableEntrySchema),
    defaultValues: { kind: 'rake', amount: '', note: '' },
  });

  useEffect(() => {
    if (kind) form.reset({ kind, amount: '', note: '' });
  }, [kind, form]);

  return (
    <Modal open={kind !== null} onClose={onClose} title={kind ? TABLE_ENTRY_KIND_LABELS[kind] : ''}>
      {kind && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            if (removesChips(data.kind) && exceedsChips(data.amount, chipsOnTableCents)) {
              form.setError('amount', {
                message: `Passa das fichas na mesa (${formatCents(chipsOnTableCents)})`,
              });
              return;
            }
            record.mutate(
              { kind: data.kind, amountCents: data.amount, note: data.note },
              {
                onSuccess: () => {
                  toast.success(`${TABLE_ENTRY_KIND_LABELS[data.kind]} registrado.`);
                  onClose();
                },
              },
            );
          })}
        >
          <p className="text-muted-foreground text-sm">{HINTS[kind]}</p>
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            autoFocus
            error={form.formState.errors.amount?.message}
            {...form.register('amount')}
          />
          <Input
            label="Observação"
            autoComplete="off"
            error={form.formState.errors.note?.message}
            {...form.register('note')}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? 'Salvando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
