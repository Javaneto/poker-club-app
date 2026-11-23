import { formatDate, formatDateTime, formatDuration, formatTime, toLocalDateKey } from './dates';

describe('datas no fuso de São Paulo', () => {
  // 02:30 UTC de 23/11 = 23:30 de 22/11 em São Paulo (UTC−3, sem horário de verão)
  const lateNight = '2026-11-23T02:30:00Z';

  it('converte para o dia e a hora locais', () => {
    expect(formatDate(lateNight)).toBe('22/11/2026');
    expect(formatTime(lateNight)).toBe('23:30');
    expect(formatDateTime(lateNight)).toBe('22/11/2026 23:30');
  });

  it('agrupa pelo dia civil local', () => {
    expect(toLocalDateKey(lateNight)).toBe('2026-11-22');
    expect(toLocalDateKey(lateNight, 'UTC')).toBe('2026-11-23');
  });

  it('rejeita data inválida', () => {
    expect(() => formatDate('não é data')).toThrow(RangeError);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '00:00'],
    [59, '00:59'],
    [600, '10:00'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
    [-10, '00:00'],
    [12.9, '00:12'],
  ])('%d s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
