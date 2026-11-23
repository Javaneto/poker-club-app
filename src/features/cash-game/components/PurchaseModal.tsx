import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/toastStore';
import { usePaymentMethods } from '@/features/cash-register/api/useCash';
import { useSeatPlayer, useTableBuyIn } from '../api/useCashGame';
import { purchaseSchema, type PurchaseFormData, type PurchaseFormInput } from '../schemas';

export interface PurchaseTarget {
  /** `seat`: sentar (compra opcional). `buy`: nova compra de quem já está sentado. */
  mode: 'seat' | 'buy';
  player: { id: string; name: string };
}

export interface PurchaseModalProps {
  clubId: string;
  tableId: string;
  target: PurchaseTarget | null;
  onClose: () => void;
}

const seatSchema = purchaseSchema(true);
const buySchema = purchaseSchema(false);

/** Sentar jogador (com primeira compra opcional) ou lançar compra de fichas na mesa. */
export function PurchaseModal({ clubId, tableId, target, onClose }: PurchaseModalProps) {
  const title = target
    ? `${target.mode === 'seat' ? 'Sentar' : 'Compra'} · ${target.player.name}`
    : '';
  return (
    <Modal open={target !== null} onClose={onClose} title={title}>
      {target && (
        <PurchaseForm
          key={`${target.mode}:${target.player.id}`}
          clubId={clubId}
          tableId={tableId}
          target={target}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function PurchaseForm({
  clubId,
  tableId,
  target,
  onClose,
}: {
  clubId: string;
  tableId: string;
  target: PurchaseTarget;
  onClose: () => void;
}) {
  const seat = useSeatPlayer(clubId, tableId);
  const buy = useTableBuyIn(clubId, tableId);
  const methods = usePaymentMethods(clubId);
  const methodOptions = (methods.data ?? [])
    .filter((method) => method.active)
    .map((method) => ({ value: method.id, label: method.name }));
  const isSeat = target.mode === 'seat';
  const form = useForm<PurchaseFormInput, unknown, PurchaseFormData>({
    resolver: zodResolver(isSeat ? seatSchema : buySchema),
    defaultValues: { amount: '', paidUpfront: false, paymentMethodId: '', note: '' },
  });
  const paidUpfront = useWatch({ control: form.control, name: 'paidUpfront' });
  const errors = form.formState.errors;
  const pending = seat.isPending || buy.isPending;

  const done = (message: string) => {
    toast.success(message);
    onClose();
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((purchase) => {
        if (isSeat) {
          seat.mutate(
            { playerId: target.player.id, purchase },
            { onSuccess: () => done('Jogador sentado.') },
          );
        } else if (purchase) {
          buy.mutate(
            { playerId: target.player.id, purchase },
            { onSuccess: () => done('Compra registrada.') },
          );
        }
      })}
    >
      <Input
        label={isSeat ? 'Primeira compra (R$, opcional)' : 'Valor da compra (R$)'}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        autoFocus
        error={errors.amount?.message}
        {...form.register('amount')}
      />
      <label className="flex min-h-10 items-center gap-3">
        <input type="checkbox" className="h-5 w-5" {...form.register('paidUpfront')} />
        <span>Pago na hora (não fica fiado)</span>
      </label>
      {paidUpfront && (
        <Select
          label="Forma de pagamento"
          placeholder="Selecione"
          options={methodOptions}
          error={errors.paymentMethodId?.message}
          {...form.register('paymentMethodId')}
        />
      )}
      <Input
        label="Observação"
        autoComplete="off"
        error={errors.note?.message}
        {...form.register('note')}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : isSeat ? 'Sentar' : 'Registrar compra'}
        </Button>
      </div>
    </form>
  );
}
