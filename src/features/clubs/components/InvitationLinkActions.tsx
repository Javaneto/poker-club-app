import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toastStore';

export interface InvitationLinkActionsProps {
  link: string;
  clubName: string;
}

/** Copiar o link do convite ou enviar pelo WhatsApp. */
export function InvitationLinkActions({ link, clubName }: InvitationLinkActionsProps) {
  const message = `Você foi convidado para a equipe do ${clubName}. Acesse: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado.');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        readOnly
        value={link}
        aria-label="Link do convite"
        onFocus={(event) => event.currentTarget.select()}
        className="border-border bg-muted h-10 rounded-lg border px-3 text-sm"
      />
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => void copy()}>
          Copiar link
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-surface hover:bg-muted inline-flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
