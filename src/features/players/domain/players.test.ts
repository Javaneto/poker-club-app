import {
  ageOn,
  formatCpf,
  formatDayMonth,
  formatIsoDate,
  formatPhone,
  isValidCpf,
  normalizeSearch,
  onlyDigits,
  whatsappLink,
} from './players';

describe('normalizeSearch', () => {
  it('remove acentos, maiúsculas e espaços extras como o banco faz', () => {
    expect(normalizeSearch('  José  DA Silva ')).toBe('jose da silva');
    expect(normalizeSearch('Natália Araújo')).toBe('natalia araujo');
  });
});

describe('CPF', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])('aceita %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each(['529.982.247-24', '111.111.111-11', '123', ''])('rejeita %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });

  it('formata com máscara', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCpf('123')).toBe('123');
  });
});

describe('telefone', () => {
  it('extrai dígitos', () => {
    expect(onlyDigits('(11) 98765-4321')).toBe('11987654321');
  });

  it('formata celular e fixo', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    expect(formatPhone('123')).toBe('123');
  });

  it('gera link do WhatsApp com o código do Brasil', () => {
    expect(whatsappLink('(11) 98765-4321')).toBe('https://wa.me/5511987654321');
    expect(whatsappLink('5511987654321')).toBe('https://wa.me/5511987654321');
  });
});

describe('datas civis', () => {
  it('calcula a idade completa', () => {
    expect(ageOn('1990-01-10', '2026-01-09')).toBe(35);
    expect(ageOn('1990-01-10', '2026-01-10')).toBe(36);
    expect(ageOn('1992-02-29', '2027-02-28')).toBe(34);
  });

  it('formata sem conversão de fuso', () => {
    expect(formatIsoDate('1990-01-10')).toBe('10/01/1990');
    expect(formatDayMonth('2026-12-30')).toBe('30/12');
  });
});
