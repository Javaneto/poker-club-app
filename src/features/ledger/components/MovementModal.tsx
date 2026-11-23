import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/toastStore';
import { useRecordMovement } from '../api/useLedger';
import { usePaymentMethods } from '@/features/cash-register/api/useCash';
import { ENTRY_KIND_LABELS, requiresPaymentMethod } from '../domain/result';
import {
  ENTRY_FORM_KINDS,
  entryFormSchema,
  type EntryFormData,
  type EntryFormInput,
  type EntryFormKind,
} from '../schemas';

const KIND_OPTIONS = ENTRY_FORM_KINDS.map((kind) => ({
  value: kind,
  label: kind === 'bar_charge' ? 'Bar (fiado)' : ENTRY_KIND_LABELS[kind],
}));

export interface MovementModalProps {
  clubId: string;
  player: { id: string; name: string } | null;
  defaultKind?: EntryFormKind;
  onClose: () => void;
}

/** Lançar compra, saída, pagamento ou bar na conta de um jogador. */
export function MovementModal({
  clubId,
  player,
  defaultKind = 'buy_in',
  onClose,
}: MovementModalProps) {
  const record = useRecordMovement(clubId);
  const methods = usePaymentMethods(clubId);
  const methodOptions = (methods.data ?? [])
    .filter((method) => method.active)
    .map((method) => ({ value: method.id, label: method.name }));
  const navigate = useNavigate();
  const form = useForm<EntryFormInput, unknown, EntryFormData>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      kind: defaultKind,
      amount: '',
      paidUpfront: false,
      paymentMethodId: '',
      note: '',
    },
  });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const paidUpfront = useWatch({ control: form.control, name: 'paidUpfront' });
  const canPayUpfront = kind === 'buy_in' || kind === 'tournament_entry';
  const needsMethod = requiresPaymentMethod(kind, canPayUpfront && paidUpfront);

  useEffect(() => {
    if (player)
      form.reset({
        kind: defaultKind,
        amount: '',
        paidUpfront: false,
        paymentMethodId: '',
        note: '',
      });
  }, [player, defaultKind, form]);

  const errors = form.formState.errors;

  const submit = (printReceipt: boolean) =>
    form.handleSubmit((data) => {
      if (!player) return;
      record.mutate(
        { playerId: player.id, data },
        {
          onSuccess: (entryId) => {
            toast.success('Lançamento registrado.');
            onClose();
            if (printReceipt) navigate(`/recibo/${entryId}`);
          },
        },
      );
    });

  const isPayment = kind === 'payment_in' || kind === 'payout';

  return (
    <Modal
      open={player !== null}
      onClose={onClose}
      title={player ? `Lançar · ${player.name}` : 'Lançar'}
    >
      <form onSubmit={submit(false)} noValidate className="flex flex-col gap-4">
        <Select label="Tipo" options={KIND_OPTIONS} {...form.register('kind')} />
        <Input
          label="Valor (R$)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          error={errors.amount?.message}
          {...form.register('amount')}
        />
        {canPayUpfront && (
          <label className="flex min-h-10 items-center gap-3">
            <input type="checkbox" className="h-5 w-5" {...form.register('paidUpfront')} />
            <span>Pago na hora (não fica fiado)</span>
          </label>
        )}
        {needsMethod && (
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
          {isPayment && (
            <Button
              variant="secondary"
              disabled={record.isPending}
              onClick={() => void submit(true)()}
            >
              Salvar e imprimir recibo
            </Button>
          )}
          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
