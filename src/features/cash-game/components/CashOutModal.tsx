import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { formatCents } from '@/lib/money';
import { useTableCashOut } from '../api/useCashGame';
import { exceedsChips } from '../domain/chips';
import { cashOutSchema, type CashOutFormData, type CashOutFormInput } from '../schemas';

export interface CashOutModalProps {
  clubId: string;
  tableId: string;
  player: { id: string; name: string } | null;
  chipsOnTableCents: number;
  onClose: () => void;
}

/** Devolução de fichas: vira crédito (saída) na conta do jogador. */
export function CashOutModal({
  clubId,
  tableId,
  player,
  chipsOnTableCents,
  onClose,
}: CashOutModalProps) {
  const cashOut = useTableCashOut(clubId, tableId);
  const form = useForm<CashOutFormInput, unknown, CashOutFormData>({
    resolver: zodResolver(cashOutSchema),
    defaultValues: { amount: '', leaveTable: true, note: '' },
  });

  useEffect(() => {
    if (player) form.reset({ amount: '', leaveTable: true, note: '' });
  }, [player, form]);

  return (
    <Modal
      open={player !== null}
      onClose={onClose}
      title={player ? `Devolução · ${player.name}` : ''}
    >
      {player && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            if (exceedsChips(data.amount, chipsOnTableCents)) {
              form.setError('amount', {
                message: `Passa das fichas na mesa (${formatCents(chipsOnTableCents)})`,
              });
              return;
            }
            cashOut.mutate(
              {
                playerId: player.id,
                amountCents: data.amount,
                leaveTable: data.leaveTable,
                note: data.note,
              },
              {
                onSuccess: () => {
                  toast.success('Devolução registrada.');
                  onClose();
                },
              },
            );
          })}
        >
          <p className="text-muted-foreground text-sm">
            Fichas na mesa:{' '}
            <strong className="tabular-nums">{formatCents(chipsOnTableCents)}</strong>
          </p>
          <Input
            label="Fichas devolvidas (R$)"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            autoFocus
            error={form.formState.errors.amount?.message}
            {...form.register('amount')}
          />
          <label className="flex min-h-10 items-center gap-3">
            <input type="checkbox" className="h-5 w-5" {...form.register('leaveTable')} />
            <span>Jogador levanta da mesa</span>
          </label>
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
            <Button type="submit" disabled={cashOut.isPending}>
              {cashOut.isPending ? 'Salvando…' : 'Registrar devolução'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
