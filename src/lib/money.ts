/**
 * Dinheiro trafega sempre em centavos inteiros (`number` seguro até 2^53 ≈ R$ 90 trilhões).
 * Formatação e leitura de texto em BRL acontecem só aqui.
 */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Valor em centavos inválido: ${cents}`);
  }
}

/** 123456 → "R$ 1.234,56" */
export function formatCents(cents: number): string {
  assertCents(cents);
  return brl.format(cents / 100);
}

/**
 * Converte texto digitado em BRL para centavos.
 * Aceita "1.234,56", "1234,5", "R$ 10", "-5,00", "10.5" (ponto decimal só quando há 1–2 casas).
 * Retorna `null` se o texto não for um valor válido.
 */
export function parseBrlToCents(input: string): number | null {
  let text = input.replace(/R\$/i, '').replace(/\s/g, '');
  if (text === '') return null;

  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  }

  let integerPart: string;
  let fractionPart = '';

  if (text.includes(',')) {
    const pieces = text.split(',');
    if (pieces.length !== 2) return null;
    integerPart = pieces[0] ?? '';
    fractionPart = pieces[1] ?? '';
    if (!/^(\d{1,3}(\.\d{3})*|\d*)$/.test(integerPart)) return null;
    integerPart = integerPart.replace(/\./g, '');
  } else if (/^\d+\.\d{1,2}$/.test(text)) {
    [integerPart = '', fractionPart = ''] = text.split('.');
  } else if (/^\d{1,3}(\.\d{3})+$|^\d+$/.test(text)) {
    integerPart = text.replace(/\./g, '');
  } else {
    return null;
  }

  if (!/^\d{0,2}$/.test(fractionPart)) return null;
  if (integerPart === '') integerPart = '0';

  const cents = Number(integerPart) * 100 + Number(fractionPart.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}
