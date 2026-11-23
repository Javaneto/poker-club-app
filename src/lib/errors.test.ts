import { toFriendlyMessage } from './errors';

describe('toFriendlyMessage', () => {
  it('traduz códigos do Supabase Auth', () => {
    expect(
      toFriendlyMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
    ).toBe('E-mail ou senha incorretos.');
  });

  it('repassa mensagens em pt-BR lançadas pelas RPCs', () => {
    expect(
      toFriendlyMessage({ code: '22023', message: 'O clube precisa de pelo menos um dono.' }),
    ).toBe('O clube precisa de pelo menos um dono.');
  });

  it('traduz códigos do Postgres quando a mensagem é técnica', () => {
    expect(
      toFriendlyMessage({ code: '42501', message: 'permission denied for table club_members' }),
    ).toBe('Você não tem permissão para fazer isso.');
  });

  it('identifica falta de conexão', () => {
    expect(toFriendlyMessage(new TypeError('Failed to fetch'))).toBe(
      'Sem conexão com o servidor. Verifique sua internet.',
    );
  });

  it('usa mensagem genérica para o desconhecido', () => {
    expect(toFriendlyMessage(null)).toBe('Algo deu errado. Tente novamente.');
    expect(toFriendlyMessage({ message: 'boom' })).toBe('Algo deu errado. Tente novamente.');
  });
});
