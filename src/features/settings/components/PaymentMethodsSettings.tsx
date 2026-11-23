import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/toastStore';
import {
  useCreatePaymentMethod,
  usePaymentMethods,
  useUpdatePaymentMethod,
} from '@/features/cash-register/api/useCash';
import { paymentMethodSchema, type PaymentMethodInput } from '@/features/cash-register/schemas';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/features/ledger/domain/result';

const KIND_OPTIONS = PAYMENT_METHODS.map((kind) => ({
  value: kind,
  label: PAYMENT_METHOD_LABELS[kind],
}));

/** Ativar, desativar, renomear e criar formas de pagamento do clube. */
export function PaymentMethodsSettings({ clubId }: { clubId: string }) {
  const methods = usePaymentMethods(clubId);
  const update = useUpdatePaymentMethod(clubId);
  const create = useCreatePaymentMethod(clubId);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const form = useForm<PaymentMethodInput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: { name: '', kind: 'other' },
  });

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {methods.data?.map((method) => (
          <li key={method.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            {editing?.id === method.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = editing.name.trim();
                  if (name.length < 2) return;
                  update.mutate({ id: method.id, name }, { onSuccess: () => setEditing(null) });
                }}
              >
                <input
                  aria-label="Novo nome"
                  value={editing.name}
                  onChange={(event) => setEditing({ id: method.id, name: event.target.value })}
                  className="border-border bg-surface h-10 flex-1 rounded-lg border px-3"
                  autoFocus
                />
                <Button type="submit" disabled={update.isPending}>
                  Salvar
                </Button>
              </form>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate font-medium">{method.name}</span>
                <Badge>{PAYMENT_METHOD_LABELS[method.kind]}</Badge>
                {!method.active && <Badge tone="warning">desativada</Badge>}
                <Button
                  variant="ghost"
                  onClick={() => setEditing({ id: method.id, name: method.name })}
                >
                  Renomear
                </Button>
                <Button
                  variant="ghost"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: method.id, active: !method.active })}
                >
                  {method.active ? 'Desativar' : 'Ativar'}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        noValidate
        className="border-border flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-end"
        onSubmit={form.handleSubmit((data) =>
          create.mutate(data, {
            onSuccess: () => {
              toast.success('Forma de pagamento criada.');
              form.reset({ name: '', kind: 'other' });
            },
          }),
        )}
      >
        <div className="flex-1">
          <Input
            label="Nova forma"
            placeholder="Ex.: Vale, Transferência"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
        </div>
        <Select label="Tipo" options={KIND_OPTIONS} {...form.register('kind')} />
        <Button type="submit" disabled={create.isPending}>
          Adicionar
        </Button>
      </form>
      <p className="text-muted-foreground text-xs">
        O tipo define como a forma entra no caixa: só o tipo “Dinheiro” é conferido no fechamento.
        Formas não podem ser apagadas, só desativadas, para manter o histórico.
      </p>
    </div>
  );
}
