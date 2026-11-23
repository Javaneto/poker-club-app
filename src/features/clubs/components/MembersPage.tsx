import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toastStore';
import { useAuth } from '@/features/auth/components/authContext';
import { formatDate } from '@/lib/dates';
import { invitationLink, type ClubMember } from '../api/clubsApi';
import {
  useClubMembers,
  usePendingInvitations,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from '../api/useClubs';
import { CLUB_ROLES, ROLE_LABELS, canManageMembers, isClubRole } from '../domain/roles';
import { InvitationLinkActions } from './InvitationLinkActions';
import { InviteMemberModal } from './InviteMemberModal';
import { useActiveClub } from './activeClubContext';

export function MembersPage() {
  const { user } = useAuth();
  const { club } = useActiveClub();
  const canManage = canManageMembers(club.role);
  const members = useClubMembers(club.id);
  const invitations = usePendingInvitations(club.id, canManage);
  const updateRole = useUpdateMemberRole(club.id);
  const removeMember = useRemoveMember(club.id);
  const revoke = useRevokeInvitation(club.id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<ClubMember | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Equipe</h1>
          <p className="text-muted-foreground text-sm">Quem tem acesso a {club.name}.</p>
        </div>
        {canManage && <Button onClick={() => setInviteOpen(true)}>Convidar</Button>}
      </header>

      {members.isPending && <p className="text-muted-foreground">Carregando…</p>}
      {members.isError && <p className="text-danger">Não foi possível carregar a equipe.</p>}

      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {members.data?.map((member) => {
          const isMe = member.userId === user?.id;
          return (
            <li key={member.userId} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {member.fullName || member.email} {isMe && <Badge>você</Badge>}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {member.email} · desde {formatDate(member.joinedAt)}
                </p>
              </div>
              {canManage ? (
                <label className="flex items-center gap-2">
                  <span className="sr-only">Papel de {member.fullName || member.email}</span>
                  <select
                    value={member.role}
                    disabled={updateRole.isPending}
                    onChange={(event) => {
                      const role = event.target.value;
                      if (!isClubRole(role)) return;
                      updateRole.mutate(
                        { userId: member.userId, role },
                        { onSuccess: () => toast.success('Papel atualizado.') },
                      );
                    }}
                    className="border-border bg-surface h-10 rounded-lg border px-2"
                  >
                    {CLUB_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <Badge tone={member.role === 'owner' ? 'success' : 'neutral'}>
                  {ROLE_LABELS[member.role]}
                </Badge>
              )}
              {(canManage || isMe) && (
                <Button variant="ghost" onClick={() => setRemoving(member)}>
                  {isMe ? 'Sair' : 'Remover'}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {canManage && (invitations.data?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Convites pendentes</h2>
          <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
            {invitations.data?.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className="text-muted-foreground text-sm">
                    {ROLE_LABELS[invitation.role]} · vale até {formatDate(invitation.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setSharing(invitationLink(invitation.token))}
                >
                  Link
                </Button>
                <Button
                  variant="ghost"
                  disabled={revoke.isPending}
                  onClick={() =>
                    revoke.mutate(invitation.id, {
                      onSuccess: () => toast.success('Convite cancelado.'),
                    })
                  }
                >
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteMemberModal
        clubId={club.id}
        clubName={club.name}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <Modal open={sharing !== null} onClose={() => setSharing(null)} title="Link do convite">
        {sharing && <InvitationLinkActions link={sharing} clubName={club.name} />}
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing?.userId === user?.id ? 'Sair do clube?' : 'Remover da equipe?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={removeMember.isPending}
              onClick={() => {
                if (!removing) return;
                removeMember.mutate(removing.userId, {
                  onSuccess: () => {
                    toast.success('Feito.');
                    setRemoving(null);
                  },
                });
              }}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <p>
          {removing?.userId === user?.id
            ? `Você perderá o acesso a ${club.name}.`
            : `${removing?.fullName || removing?.email} perderá o acesso a ${club.name}.`}
        </p>
      </Modal>
    </section>
  );
}
