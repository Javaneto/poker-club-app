import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { useCashMovement } from '../api/useCash';
import { cashMovementSchema, type CashMovementData, type CashMovementInput } from '../schemas';

const TITLES = { withdrawal: 'Sangria (retirada)', deposit: 'Suprimento (reforço)' } as const;

export interface CashMovementModalProps {
  clubId: string;
  sessionId: string;
  kind: 'withdrawal' | 'deposit' | null;
  onClose: () => void;
}

export function CashMovementModal({ clubId, sessionId, kind, onClose }: CashMovementModalProps) {
  const movement = useCashMovement(clubId);
  const form = useForm<CashMovementInput, unknown, CashMovementData>({
    resolver: zodResolver(cashMovementSchema),
    defaultValues: { amount: '', note: '' },
  });

  useEffect(() => {
    if (kind) form.reset({ amount: '', note: '' });
  }, [kind, form]);

  return (
    <Modal open={kind !== null} onClose={onClose} title={kind ? TITLES[kind] : ''}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((data) => {
          if (!kind) return;
          movement.mutate(
            { sessionId, kind, amountCents: data.amount, note: data.note },
            {
              onSuccess: () => {
                toast.success(
                  kind === 'withdrawal' ? 'Sangria registrada.' : 'Suprimento registrado.',
                );
                onClose();
              },
            },
          );
        })}
      >
        <Input
          label="Valor em dinheiro (R$)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          error={form.formState.errors.amount?.message}
          {...form.register('amount')}
        />
        <Input
          label={kind === 'withdrawal' ? 'Motivo / destino' : 'Origem'}
          autoComplete="off"
          error={form.formState.errors.note?.message}
          {...form.register('note')}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={movement.isPending}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
