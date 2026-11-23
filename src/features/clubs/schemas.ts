import { z } from 'zod';
import { CLUB_ROLES } from './domain/roles';

export const createClubSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome precisa ter pelo menos 2 caracteres')
    .max(80, 'Use no máximo 80 caracteres'),
});
export type CreateClubInput = z.input<typeof createClubSchema>;

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail')
    .pipe(z.email({ message: 'E-mail inválido' }))
    .transform((value) => value.toLowerCase()),
  role: z.enum(CLUB_ROLES, { message: 'Escolha um papel' }),
});
export type InviteMemberInput = z.input<typeof inviteMemberSchema>;
export type InviteMemberData = z.output<typeof inviteMemberSchema>;
