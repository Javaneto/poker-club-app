import { describe, expect, it } from 'vitest';
import { formatSeatTime, secondsSeated } from './seatTime';

describe('secondsSeated', () => {
  const now = new Date('2026-11-23T22:00:00Z');

  it('soma passagens encerradas com o assento atual', () => {
    expect(secondsSeated({ completedSeconds: 600, seatedAt: '2026-11-23T21:30:00Z' }, now)).toBe(
      600 + 1800,
    );
  });

  it('quem levantou fica só com o tempo encerrado', () => {
    expect(secondsSeated({ completedSeconds: 3600, seatedAt: null }, now)).toBe(3600);
  });

  it('relógio do servidor adiantado não gera tempo negativo', () => {
    expect(secondsSeated({ completedSeconds: 0, seatedAt: '2026-11-23T22:05:00Z' }, now)).toBe(0);
  });
});

describe('formatSeatTime', () => {
  it('minutos e horas', () => {
    expect(formatSeatTime(59)).toBe('0 min');
    expect(formatSeatTime(45 * 60)).toBe('45 min');
    expect(formatSeatTime(2 * 3600 + 5 * 60)).toBe('2 h 05 min');
  });
});
