import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { reverseFormSchema, type ReverseFormInput } from '@/features/ledger/schemas';
import { formatCents } from '@/lib/money';
import type { TableActivity } from '../api/cashGameApi';
import { useReverseActivity } from '../api/useCashGame';
import { activityLabel } from './activityLabel';

export interface ReverseActivityModalProps {
  clubId: string;
  item: TableActivity | null;
  onClose: () => void;
}

/** Estorno = novo lançamento que anula o original (nada é apagado). */
export function ReverseActivityModal({ clubId, item, onClose }: ReverseActivityModalProps) {
  const reverse = useReverseActivity(clubId);
  const form = useForm<ReverseFormInput>({
    resolver: zodResolver(reverseFormSchema),
    defaultValues: { note: '' },
  });

  useEffect(() => {
    if (item) form.reset({ note: '' });
  }, [item, form]);

  return (
    <Modal open={item !== null} onClose={onClose} title="Estornar lançamento">
      {item && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(({ note }) =>
            reverse.mutate(
              { item, note },
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
            {activityLabel(item)} de <strong>{formatCents(item.amountCents)}</strong> será anulado
            por um estorno. O lançamento original continua no histórico.
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
