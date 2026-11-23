import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { useOpenTable } from '../api/useCashGame';
import { openTableSchema, type OpenTableFormData, type OpenTableFormInput } from '../schemas';

const EMPTY: OpenTableFormInput = {
  name: '',
  smallBlind: '',
  bigBlind: '',
  maxPlayers: '',
  note: '',
};

export interface OpenTableModalProps {
  clubId: string;
  open: boolean;
  onClose: () => void;
}

export function OpenTableModal({ clubId, open, onClose }: OpenTableModalProps) {
  const openTable = useOpenTable(clubId);
  const navigate = useNavigate();
  const form = useForm<OpenTableFormInput, unknown, OpenTableFormData>({
    resolver: zodResolver(openTableSchema),
    defaultValues: EMPTY,
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  return (
    <Modal open={open} onClose={onClose} title="Abrir mesa de cash">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((data) =>
          openTable.mutate(data, {
            onSuccess: (tableId) => {
              toast.success('Mesa aberta.');
              onClose();
              navigate(`/mesas/${tableId}`);
            },
          }),
        )}
      >
        <Input
          label="Nome da mesa"
          autoComplete="off"
          placeholder="Mesa 1"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Small blind (R$, opcional)"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1,00"
            error={errors.smallBlind?.message}
            {...form.register('smallBlind')}
          />
          <Input
            label="Big blind (R$, opcional)"
            inputMode="decimal"
            autoComplete="off"
            placeholder="2,00"
            error={errors.bigBlind?.message}
            {...form.register('bigBlind')}
          />
        </div>
        <Input
          label="Limite de jogadores (opcional)"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Sem limite"
          error={errors.maxPlayers?.message}
          {...form.register('maxPlayers')}
        />
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
          <Button type="submit" disabled={openTable.isPending}>
            {openTable.isPending ? 'Abrindo…' : 'Abrir mesa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
