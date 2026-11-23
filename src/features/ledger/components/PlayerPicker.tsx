import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { usePlayerList } from '@/features/players/api/usePlayers';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

export interface PlayerPickerProps {
  clubId: string;
  open: boolean;
  onPick: (player: { id: string; name: string }) => void;
  onClose: () => void;
}

/** Busca um jogador ativo para lançar (nome, apelido, telefone ou CPF). */
export function PlayerPicker({ clubId, open, onPick, onClose }: PlayerPickerProps) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const list = usePlayerList({
    clubId,
    search: debounced,
    status: 'active',
    sort: 'name',
    page: 1,
  });

  return (
    <Modal open={open} onClose={onClose} title="Escolher jogador">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome, apelido, telefone ou CPF"
          aria-label="Buscar jogador"
          className="border-border bg-surface focus-visible:ring-ring h-10 rounded-lg border px-3 focus-visible:ring-2 focus-visible:outline-none"
        />
        <ul className="divide-border border-border max-h-80 divide-y overflow-y-auto rounded-lg border">
          {list.data?.items.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  onPick({ id: player.id, name: player.fullName });
                }}
                className="hover:bg-muted/50 flex min-h-11 w-full items-center gap-2 px-3 text-left"
              >
                <span className="flex-1 truncate">
                  {player.fullName}
                  {player.nickname && (
                    <span className="text-muted-foreground"> · {player.nickname}</span>
                  )}
                </span>
                {player.openSessionId && <span className="text-primary text-xs">em jogo</span>}
              </button>
            </li>
          ))}
          {list.data?.items.length === 0 && (
            <li className="text-muted-foreground p-3 text-sm">Nenhum jogador ativo encontrado.</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
