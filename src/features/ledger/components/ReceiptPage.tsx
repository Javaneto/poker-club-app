import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { formatDateTime } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { useReceipt } from '../api/useLedger';
import { ENTRY_KIND_LABELS, PAYMENT_METHOD_LABELS } from '../domain/result';

/** Recibo para impressora térmica de 80 mm (ou 58 mm, pela largura do clube). */
export function ReceiptPage() {
  const { entryId = '' } = useParams();
  const { club } = useActiveClub();
  const receipt = useReceipt(club.id, entryId);

  useEffect(() => {
    document.body.classList.add('receipt-mode');
    return () => document.body.classList.remove('receipt-mode');
  }, []);

  if (receipt.isPending) return <p className="text-muted-foreground p-4">Carregando…</p>;
  if (!receipt.data) return <p className="p-4">Recibo não encontrado.</p>;

  const { entry, playerName, clubName, balanceCents } = receipt.data;
  const title = entry.kind === 'payout' ? 'Pagamento ao jogador' : 'Recibo de pagamento';

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="no-print flex gap-2">
        <Link
          to={`/jogadores/${entry.playerId}`}
          className="border-border bg-surface inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
        >
          Voltar
        </Link>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>

      <article className="receipt bg-white p-3 font-mono text-[12px] leading-snug text-black shadow">
        <p className="text-center text-sm font-bold">{clubName}</p>
        <p className="text-center">{title}</p>
        <hr className="my-2 border-dashed border-black" />
        <p>Data: {formatDateTime(entry.createdAt)}</p>
        <p>Jogador: {playerName}</p>
        <p>Tipo: {ENTRY_KIND_LABELS[entry.kind]}</p>
        {entry.paymentMethod && <p>Forma: {PAYMENT_METHOD_LABELS[entry.paymentMethod]}</p>}
        {entry.note && <p>Obs.: {entry.note}</p>}
        <hr className="my-2 border-dashed border-black" />
        <p className="flex justify-between text-sm font-bold">
          <span>VALOR</span>
          <span>{formatCents(entry.amountCents)}</span>
        </p>
        <p className="flex justify-between">
          <span>Saldo atual</span>
          <span>
            {balanceCents < 0
              ? `deve ${formatCents(-balanceCents)}`
              : balanceCents > 0
                ? `crédito ${formatCents(balanceCents)}`
                : 'zerado'}
          </span>
        </p>
        {entry.reversedById && <p className="mt-2 text-center font-bold">*** ESTORNADO ***</p>}
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center text-[10px]">
          Comprovante nº {entry.id.slice(0, 8).toUpperCase()}
        </p>
      </article>
    </div>
  );
}
