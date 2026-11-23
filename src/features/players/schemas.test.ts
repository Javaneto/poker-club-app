import { emptyPlayerForm, playerFormSchema } from './schemas';

describe('playerFormSchema', () => {
  it('limpa máscaras e transforma vazios em null', () => {
    const data = playerFormSchema.parse({
      ...emptyPlayerForm,
      fullName: '  José   da Silva ',
      phone: '(11) 98765-4321',
      cpf: '529.982.247-25',
      email: ' Jose@Clube.COM ',
    });
    expect(data).toEqual({
      fullName: 'José da Silva',
      nickname: null,
      phone: '11987654321',
      cpf: '52998224725',
      email: 'jose@clube.com',
      birthDate: null,
      notes: null,
    });
  });

  it('rejeita CPF com dígito errado', () => {
    const result = playerFormSchema.safeParse({
      ...emptyPlayerForm,
      fullName: 'Ana',
      cpf: '529.982.247-24',
    });
    expect(result.error?.issues[0]?.message).toBe('CPF inválido');
  });

  it('rejeita telefone sem DDD', () => {
    const result = playerFormSchema.safeParse({
      ...emptyPlayerForm,
      fullName: 'Ana',
      phone: '98765-4321',
    });
    expect(result.error?.issues[0]?.message).toBe('Telefone com DDD (10 ou 11 dígitos)');
  });

  it('rejeita nascimento no futuro', () => {
    const result = playerFormSchema.safeParse({
      ...emptyPlayerForm,
      fullName: 'Ana',
      birthDate: '2999-01-01',
    });
    expect(result.success).toBe(false);
  });
});
