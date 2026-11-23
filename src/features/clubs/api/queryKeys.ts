export const clubKeys = {
  all: ['clubs'] as const,
  mine: (userId: string) => [...clubKeys.all, 'mine', userId] as const,
  members: (clubId: string) => [...clubKeys.all, clubId, 'members'] as const,
  invitations: (clubId: string) => [...clubKeys.all, clubId, 'invitations'] as const,
  invitation: (token: string) => [...clubKeys.all, 'invitation', token] as const,
};
