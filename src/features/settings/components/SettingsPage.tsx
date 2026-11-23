import { useRequireOpenCash, useSetRequireOpenCash } from '@/features/cash-register/api/useCash';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { canEditClub } from '@/features/clubs/domain/roles';
import { PaymentMethodsSettings } from './PaymentMethodsSettings';

export function SettingsPage() {
  const { club } = useActiveClub();
  const requireOpen = useRequireOpenCash(club.id);
  const setRequireOpen = useSetRequireOpenCash(club.id);

  if (!canEditClub(club.role)) {
    return <p className="text-muted-foreground">Só o dono e o gerente alteram as configurações.</p>;
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Caixa do Dia</h2>
        <label className="border-border bg-surface flex min-h-12 items-start gap-3 rounded-lg border p-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={requireOpen.data ?? true}
            disabled={requireOpen.isPending || setRequireOpen.isPending}
            onChange={(event) => setRequireOpen.mutate(event.target.checked)}
          />
          <span>
            <span className="font-medium">Exigir caixa aberto para receber e pagar</span>
            <span className="text-muted-foreground block text-sm">
              Com isso ligado, compras pagas na hora, pagamentos e estornos com dinheiro só podem
              ser lançados com o caixa aberto. Lançamentos fiados não dependem do caixa.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Formas de pagamento</h2>
        <PaymentMethodsSettings clubId={club.id} />
      </div>
    </section>
  );
}
