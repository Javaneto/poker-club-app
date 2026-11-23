import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import type { TableSummary } from '../api/cashGameApi';
import { useCloseTable } from '../api/useCashGame';
import { CLOSE_BLOCKER_MESSAGES, closeBlocker } from '../domain/chips';
import { closeTableSchema, type CloseTableFormData, type CloseTableFormInput } from '../schemas';
import { TableSummaryPanel } from './TableSummaryPanel';

export interface CloseTableModalProps {
  clubId: string;
  tableId: string;
  summary: TableSummary;
  open: boolean;
  onClose: () => void;
}

/** Encerrar só com fichas zeradas e ninguém sentado. Mesa encerrada não reabre. */
export function CloseTableModal({ clubId, tableId, summary, open, onClose }: CloseTableModalProps) {
  const close = useCloseTable(clubId, tableId);
  const form = useForm<CloseTableFormInput, unknown, CloseTableFormData>({
    resolver: zodResolver(closeTableSchema),
    defaultValues: { note: '' },
  });
  const blocker = closeBlocker(summary);

  useEffect(() => {
    if (open) form.reset({ note: '' });
  }, [open, form]);

  return (
    <Modal open={open} onClose={onClose} title="Encerrar mesa">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(({ note }) =>
          close.mutate(note, {
            onSuccess: () => {
              toast.success('Mesa encerrada.');
              onClose();
            },
          }),
        )}
      >
        <TableSummaryPanel summary={summary} />
        {blocker ? (
          <p role="alert" className="text-danger text-sm">
            {CLOSE_BLOCKER_MESSAGES[blocker]}
          </p>
        ) : (
          <p className="text-success text-sm">
            Conferência fechada. Depois de encerrada, a mesa não reabre.
          </p>
        )}
        <Input
          label="Observação"
          autoComplete="off"
          disabled={blocker !== null}
          error={form.formState.errors.note?.message}
          {...form.register('note')}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" variant="danger" disabled={blocker !== null || close.isPending}>
            Encerrar mesa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
