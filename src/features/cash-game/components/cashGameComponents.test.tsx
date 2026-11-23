import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { TablePlayer, TableSummary } from '../api/cashGameApi';
import { CloseTableModal } from './CloseTableModal';
import { TablePlayerCard } from './TablePlayerCard';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const seatedPlayer: TablePlayer = {
  playerId: 'p1',
  fullName: 'Jogador Um',
  nickname: 'Um',
  seatId: 's1',
  seatedAt: '2026-11-23T21:00:00Z',
  completedSeconds: 0,
  buyInCents: 15000,
  cashOutCents: 0,
};

function withQuery(children: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('TablePlayerCard', () => {
  it('mostra tempo sentado, compras e as ações de quem está sentado', async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    render(
      <ul>
        <TablePlayerCard
          player={seatedPlayer}
          now={new Date('2026-11-23T22:30:00Z')}
          actions={{ onBuy, onCashOut: vi.fn(), onUnseat: vi.fn() }}
        />
      </ul>,
    );
    expect(screen.getByText(/1 h 30 min/)).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Compra' }));
    expect(onBuy).toHaveBeenCalledOnce();
  });

  it('quem já levantou mostra o resultado e não tem ações', () => {
    render(
      <ul>
        <TablePlayerCard
          player={{ ...seatedPlayer, seatId: null, seatedAt: null, cashOutCents: 30000 }}
          now={new Date('2026-11-23T22:30:00Z')}
          actions={{ onBuy: vi.fn(), onCashOut: vi.fn(), onUnseat: vi.fn() }}
        />
      </ul>,
    );
    expect(screen.getByText('Resultado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compra' })).not.toBeInTheDocument();
  });
});

describe('CloseTableModal', () => {
  const base: TableSummary = {
    purchasesCents: 35000,
    returnsCents: 30000,
    rakeCents: 4500,
    tipsCents: 500,
    expensesCents: 3000,
    chipsCents: 0,
    seatedCount: 0,
  };

  it('bloqueia encerrar com fichas na mesa', () => {
    render(
      withQuery(
        <CloseTableModal
          clubId="c1"
          tableId="t1"
          summary={{ ...base, rakeCents: 0, chipsCents: 4500 }}
          open
          onClose={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Ainda há fichas na mesa');
    expect(screen.getByRole('button', { name: 'Encerrar mesa' })).toBeDisabled();
  });

  it('libera com conferência zerada e ninguém sentado', () => {
    render(
      withQuery(<CloseTableModal clubId="c1" tableId="t1" summary={base} open onClose={vi.fn()} />),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar mesa' })).toBeEnabled();
  });
});
