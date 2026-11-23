import { z } from 'zod';
import { isValidCpf, onlyDigits } from './domain/players';

/** Texto opcional: vazio vira null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres`)
    .transform((value) => (value === '' ? null : value));

export const playerFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Informe o nome completo')
    .max(120, 'Use no máximo 120 caracteres')
    .transform((value) => value.replace(/\s+/g, ' ')),
  nickname: optionalText(60),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((value) => value === '' || (value.length >= 10 && value.length <= 13), {
      message: 'Telefone com DDD (10 ou 11 dígitos)',
    })
    .transform((value) => (value === '' ? null : value)),
  cpf: z
    .string()
    .transform(onlyDigits)
    .refine((value) => value === '' || isValidCpf(value), { message: 'CPF inválido' })
    .transform((value) => (value === '' ? null : value)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === '' || z.email().safeParse(value).success, {
      message: 'E-mail inválido',
    })
    .transform((value) => (value === '' ? null : value)),
  birthDate: z
    .string()
    .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Data inválida',
    })
    .refine((value) => value === '' || (value >= '1900-01-01' && value <= todayIso()), {
      message: 'Data de nascimento fora do intervalo',
    })
    .transform((value) => (value === '' ? null : value)),
  notes: optionalText(2000),
});

export type PlayerFormInput = z.input<typeof playerFormSchema>;
export type PlayerFormData = z.output<typeof playerFormSchema>;

export const emptyPlayerForm: PlayerFormInput = {
  fullName: '',
  nickname: '',
  phone: '',
  cpf: '',
  email: '',
  birthDate: '',
  notes: '',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
