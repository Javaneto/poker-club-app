import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { invitationLink } from '../api/clubsApi';
import { useCreateInvitation } from '../api/useClubs';
import { CLUB_ROLES, ROLE_LABELS } from '../domain/roles';
import { inviteMemberSchema, type InviteMemberData, type InviteMemberInput } from '../schemas';
import { InvitationLinkActions } from './InvitationLinkActions';

const ROLE_OPTIONS = CLUB_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

export interface InviteMemberModalProps {
  clubId: string;
  clubName: string;
  open: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ clubId, clubName, open, onClose }: InviteMemberModalProps) {
  const create = useCreateInvitation(clubId);
  const [link, setLink] = useState<string | null>(null);
  const form = useForm<InviteMemberInput, unknown, InviteMemberData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'cashier' },
  });

  function close() {
    setLink(null);
    form.reset();
    create.reset();
    onClose();
  }

  const onSubmit = form.handleSubmit((data) =>
    create.mutate(data, { onSuccess: (invitation) => setLink(invitationLink(invitation.token)) }),
  );

  return (
    <Modal open={open} onClose={close} title="Convidar para a equipe">
      {link ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Convite criado. Envie o link abaixo para a pessoa. Ele vale por 7 dias e só funciona com
            o e-mail convidado.
          </p>
          <InvitationLinkActions link={link} clubName={clubName} />
          <Button variant="secondary" onClick={close}>
            Concluir
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="E-mail da pessoa"
            type="email"
            inputMode="email"
            autoComplete="off"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Select
            label="Papel"
            options={ROLE_OPTIONS}
            error={form.formState.errors.role?.message}
            {...form.register('role')}
          />
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending ? 'Criando convite…' : 'Criar convite'}
          </Button>
        </form>
      )}
    </Modal>
  );
}
