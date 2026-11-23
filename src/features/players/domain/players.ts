/** Regras puras de jogador: normalização para busca, CPF, telefone e idade. */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Mesma normalização da coluna `search_text` no banco: minúsculas e sem acentos. */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Valida CPF pelos dígitos verificadores (aceita com ou sem máscara). */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);
  const checkDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

/** "52998224725" → "529.982.247-25" */
export function formatCpf(value: string): string {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return value;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** "11987654321" → "(11) 98765-4321"; "1133334444" → "(11) 3333-4444". */
export function formatPhone(value: string): string {
  const phone = onlyDigits(value);
  if (phone.length === 11) return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (phone.length === 10) return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value;
}

/** Link do WhatsApp para um telefone brasileiro (acrescenta 55 quando falta). */
export function whatsappLink(phone: string): string {
  const digits = onlyDigits(phone);
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

/** Idade completa em `today` (datas ISO "AAAA-MM-DD", sem fuso). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) throw new RangeError('Data inválida');
  const hadBirthday = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthday ? 0 : 1);
}

/** "1990-01-10" → "10/01/1990" (data civil, sem conversão de fuso). */
export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** "2026-12-30" → "30/12" */
export function formatDayMonth(value: string): string {
  const [, month, day] = value.split('-');
  return month && day ? `${day}/${month}` : value;
}
