import { parseEnv } from './env';

describe('parseEnv', () => {
  it('aceita configuração válida', () => {
    const env = parseEnv({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'chave-de-teste',
    });
    expect(env.VITE_SUPABASE_URL).toBe('http://127.0.0.1:54321');
  });

  it('explica o que falta', () => {
    expect(() => parseEnv({ VITE_SUPABASE_URL: 'não-é-url' })).toThrow(/Configuração inválida/);
  });
});
