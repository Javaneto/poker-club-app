import { describe, expect, it } from 'vitest';
import { formatCents } from '@/lib/money';
import {
  chipsOnTable,
  closeBlocker,
  exceedsChips,
  formatBlinds,
  isTableEntryKind,
  playerTableResult,
  removesChips,
  sumTableEntries,
} from './chips';

describe('chipsOnTable', () => {
  it('compras − devoluções − rake − capilé (mesmo caso do teste do banco)', () => {
    expect(
      chipsOnTable({ purchasesCents: 35000, returnsCents: 0, rakeCents: 1500, tipsCents: 500 }),
    ).toBe(33000);
  });

  it('mesa conferida fica em zero', () => {
    expect(
      chipsOnTable({ purchasesCents: 35000, returnsCents: 30000, rakeCents: 4500, tipsCents: 500 }),
    ).toBe(0);
  });
});

describe('sumTableEntries', () => {
  it('estorno anula o lançamento e despesa fica separada', () => {
    expect(
      sumTableEntries([
        { kind: 'rake', amountCents: 1500, isReversal: false },
        { kind: 'rake', amountCents: 1500, isReversal: true },
        { kind: 'rake', amountCents: 4500, isReversal: false },
        { kind: 'tip', amountCents: 500, isReversal: false },
        { kind: 'expense', amountCents: 3000, isReversal: false },
      ]),
    ).toEqual({ rake: 4500, tip: 500, expense: 3000 });
  });
});

describe('closeBlocker', () => {
  it('jogadores sentados bloqueiam antes de tudo', () => {
    expect(closeBlocker({ chipsCents: 0, seatedCount: 1 })).toBe('players_seated');
  });

  it('fichas restantes ou negativas bloqueiam', () => {
    expect(closeBlocker({ chipsCents: 4500, seatedCount: 0 })).toBe('chips_remaining');
    expect(closeBlocker({ chipsCents: -100, seatedCount: 0 })).toBe('chips_negative');
  });

  it('libera com zero fichas e ninguém sentado', () => {
    expect(closeBlocker({ chipsCents: 0, seatedCount: 0 })).toBeNull();
  });
});

describe('regras auxiliares', () => {
  it('rake e capilé tiram fichas; despesa não', () => {
    expect(removesChips('rake')).toBe(true);
    expect(removesChips('tip')).toBe(true);
    expect(removesChips('expense')).toBe(false);
  });

  it('saída não pode passar das fichas', () => {
    expect(exceedsChips(33001, 33000)).toBe(true);
    expect(exceedsChips(33000, 33000)).toBe(false);
  });

  it('resultado do jogador = devoluções − compras', () => {
    expect(playerTableResult({ buyInCents: 15000, cashOutCents: 30000 })).toBe(15000);
    expect(playerTableResult({ buyInCents: 20000, cashOutCents: 0 })).toBe(-20000);
  });

  it('formata blinds', () => {
    expect(formatBlinds(100, 200, formatCents)).toBe('R$ 1/2');
    expect(formatBlinds(250, 500, formatCents)).toBe('R$ 2,50/5');
    expect(formatBlinds(null, 500, formatCents)).toBe('BB R$ 5');
    expect(formatBlinds(100, null, formatCents)).toBe('SB R$ 1');
    expect(formatBlinds(null, null, formatCents)).toBeNull();
  });

  it('valida tipo de lançamento da mesa', () => {
    expect(isTableEntryKind('tip')).toBe(true);
    expect(isTableEntryKind('buy_in')).toBe(false);
  });
});
