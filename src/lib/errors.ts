/**
 * Converte erros do Supabase (Auth, PostgREST, RPC) em mensagens amigáveis em pt-BR.
 * As RPCs do projeto já lançam mensagens em português (RAISE EXCEPTION) — essas passam direto.
 */

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  email_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  signup_disabled: 'Novos cadastros estão desativados.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  refresh_token_not_found: 'Sua sessão expirou. Entre novamente.',
};

const POSTGRES_MESSAGES: Record<string, string> = {
  '42501': 'Você não tem permissão para fazer isso.',
  '23505': 'Esse registro já existe.',
  '23514': 'Algum valor informado é inválido.',
  P0002: 'Registro não encontrado.',
};

const DEFAULT_MESSAGE = 'Algo deu errado. Tente novamente.';

function readString(value: unknown, key: string): string | undefined {
  if (typeof value !== 'object' || value === null || !(key in value)) return undefined;
  const field: unknown = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : undefined;
}

/**
 * Mensagens das nossas RPCs (RAISE EXCEPTION) são frases em pt-BR terminadas em ponto.
 * As mensagens nativas do Postgres/PostgREST ("permission denied for table x") nunca terminam em ponto.
 */
function isOwnRpcMessage(message: string): boolean {
  return /\.\)?$/.test(message.trim()) && /^[A-ZÀ-Ú]/.test(message);
}

export function toFriendlyMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  const authCode = readString(error, 'code');
  if (authCode && authCode in AUTH_MESSAGES) return AUTH_MESSAGES[authCode] ?? DEFAULT_MESSAGE;

  const message = readString(error, 'message');
  if (message && isOwnRpcMessage(message)) return message;

  if (authCode && authCode in POSTGRES_MESSAGES)
    return POSTGRES_MESSAGES[authCode] ?? DEFAULT_MESSAGE;

  if (message === 'Failed to fetch' || message?.includes('NetworkError')) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }

  return DEFAULT_MESSAGE;
}
