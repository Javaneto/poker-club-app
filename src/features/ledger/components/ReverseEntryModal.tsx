import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { formatCents } from '@/lib/money';
import type { LedgerEntry } from '../api/ledgerApi';
import { useReverseEntry } from '../api/useLedger';
import { ENTRY_KIND_LABELS } from '../domain/result';
import { reverseFormSchema, type ReverseFormInput } from '../schemas';

export interface ReverseEntryModalProps {
  clubId: string;
  entry: LedgerEntry | null;
  onClose: () => void;
}

/** Estorno = novo lançamento que anula o original (nada é apagado). */
export function ReverseEntryModal({ clubId, entry, onClose }: ReverseEntryModalProps) {
  const reverse = useReverseEntry(clubId);
  const form = useForm<ReverseFormInput>({
    resolver: zodResolver(reverseFormSchema),
    defaultValues: { note: '' },
  });

  useEffect(() => {
    if (entry) form.reset({ note: '' });
  }, [entry, form]);

  return (
    <Modal open={entry !== null} onClose={onClose} title="Estornar lançamento">
      {entry && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(({ note }) =>
            reverse.mutate(
              { entryId: entry.id, note },
              {
                onSuccess: () => {
                  toast.success('Lançamento estornado.');
                  onClose();
                },
              },
            ),
          )}
        >
          <p className="text-sm">
            {ENTRY_KIND_LABELS[entry.kind]} de <strong>{formatCents(entry.amountCents)}</strong>{' '}
            será anulado por um estorno. O lançamento original continua no histórico.
          </p>
          <Input
            label="Motivo"
            autoComplete="off"
            error={form.formState.errors.note?.message}
            {...form.register('note')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={reverse.isPending}>
              Estornar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
