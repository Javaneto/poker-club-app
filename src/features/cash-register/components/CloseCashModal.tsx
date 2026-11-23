import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { formatCents, parseBrlToCents } from '@/lib/money';
import { useCloseCash } from '../api/useCash';
import { DIFFERENCE_LABELS, closingDifference, differenceStatus } from '../domain/cash';
import { closeCashSchema, type CloseCashData, type CloseCashInput } from '../schemas';

export interface CloseCashModalProps {
  clubId: string;
  sessionId: string;
  expectedCashCents: number;
  open: boolean;
  onClose: () => void;
}

export function CloseCashModal({
  clubId,
  sessionId,
  expectedCashCents,
  open,
  onClose,
}: CloseCashModalProps) {
  const close = useCloseCash(clubId);
  const form = useForm<CloseCashInput, unknown, CloseCashData>({
    resolver: zodResolver(closeCashSchema),
    defaultValues: { counted: '', note: '' },
  });
  const countedText = useWatch({ control: form.control, name: 'counted' });
  const counted = parseBrlToCents(countedText);
  const difference = counted === null ? null : closingDifference(counted, expectedCashCents);
  const status = difference === null ? null : differenceStatus(difference);

  useEffect(() => {
    if (open) form.reset({ counted: '', note: '' });
  }, [open, form]);

  return (
    <Modal open={open} onClose={onClose} title="Fechar caixa">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((data) =>
          close.mutate(
            { sessionId, countedCents: data.counted, note: data.note },
            {
              onSuccess: (diff) => {
                toast.success(
                  diff === 0
                    ? 'Caixa fechado. Bateu certinho.'
                    : `Caixa fechado com diferença de ${formatCents(diff)}.`,
                );
                onClose();
              },
            },
          ),
        )}
      >
        <p className="text-sm">
          Esperado em dinheiro: <strong>{formatCents(expectedCashCents)}</strong>. Conte só o
          dinheiro físico da gaveta.
        </p>
        <Input
          label="Valor contado (R$)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          error={form.formState.errors.counted?.message}
          {...form.register('counted')}
        />
        {difference !== null && status && (
          <p
            role="status"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              status === 'exact' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}
          >
            {DIFFERENCE_LABELS[status]}
            {status !== 'exact' && `: ${formatCents(Math.abs(difference))}`}
          </p>
        )}
        <Input
          label="Observação"
          autoComplete="off"
          error={form.formState.errors.note?.message}
          {...form.register('note')}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={close.isPending}>
            Fechar caixa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
