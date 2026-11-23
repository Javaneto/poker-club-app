import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCpf, formatPhone } from '../domain/players';
import { playerFormSchema, type PlayerFormData, type PlayerFormInput } from '../schemas';

export interface PlayerFormProps {
  defaultValues: PlayerFormInput;
  submitLabel: string;
  pending: boolean;
  onSubmit: (data: PlayerFormData) => void;
  onCancel: () => void;
}

export function PlayerForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: PlayerFormProps) {
  const form = useForm<PlayerFormInput, unknown, PlayerFormData>({
    resolver: zodResolver(playerFormSchema),
    defaultValues,
  });
  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input
        label="Nome completo *"
        autoComplete="off"
        error={errors.fullName?.message}
        {...form.register('fullName')}
      />
      <Input
        label="Apelido"
        autoComplete="off"
        error={errors.nickname?.message}
        {...form.register('nickname')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Telefone (com DDD)"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 98765-4321"
          error={errors.phone?.message}
          {...form.register('phone', {
            onBlur: (event: { target: { value: string } }) =>
              form.setValue('phone', formatPhone(event.target.value)),
          })}
        />
        <Input
          label="CPF"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          error={errors.cpf?.message}
          {...form.register('cpf', {
            onBlur: (event: { target: { value: string } }) =>
              form.setValue('cpf', formatCpf(event.target.value)),
          })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="off"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <Input
          label="Data de nascimento"
          type="date"
          error={errors.birthDate?.message}
          {...form.register('birthDate')}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="player-notes" className="text-sm font-medium">
          Observação
        </label>
        <textarea
          id="player-notes"
          rows={3}
          className="border-border bg-surface focus-visible:ring-ring rounded-lg border px-3 py-2 focus-visible:ring-2 focus-visible:outline-none"
          aria-invalid={errors.notes ? true : undefined}
          {...form.register('notes')}
        />
        {errors.notes && <p className="text-danger text-sm">{errors.notes.message}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
