import { loginSchema, resetPasswordSchema, safeNextPath, signUpSchema } from './schemas';

describe('schemas de autenticação', () => {
  it('normaliza o e-mail do login', () => {
    const data = loginSchema.parse({ email: '  Fulano@Clube.COM ', password: 'x' });
    expect(data.email).toBe('fulano@clube.com');
  });

  it('rejeita e-mail inválido com mensagem em pt-BR', () => {
    const result = loginSchema.safeParse({ email: 'fulano', password: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('E-mail inválido');
  });

  it('exige senha de 8+ caracteres e confirmação igual no cadastro', () => {
    const short = signUpSchema.safeParse({
      fullName: 'Fulano',
      email: 'a@b.com',
      password: '1234567',
      confirmPassword: '1234567',
    });
    expect(short.success).toBe(false);

    const mismatch = resetPasswordSchema.safeParse({
      password: '12345678',
      confirmPassword: '12345679',
    });
    expect(mismatch.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/convite/abc', '/convite/abc'],
    [null, '/'],
    ['https://malicioso.com', '/'],
    ['//malicioso.com', '/'],
    ['/\\malicioso.com', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
