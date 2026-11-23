import { useNavigate } from 'react-router-dom';
import { useActiveClub } from './activeClubContext';

const NEW_CLUB = '__new__';

/** Troca de clube ativo (ou leva para criar outro). */
export function ClubSwitcher() {
  const { club, clubs, selectClub } = useActiveClub();
  const navigate = useNavigate();

  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="sr-only">Clube ativo</span>
      <select
        value={club.id}
        onChange={(event) => {
          const value = event.target.value;
          if (value === NEW_CLUB) {
            navigate('/novo-clube');
            return;
          }
          selectClub(value);
          navigate('/');
        }}
        className="border-border bg-surface focus-visible:ring-ring h-10 max-w-[60vw] truncate rounded-lg border px-3 font-semibold focus-visible:ring-2 focus-visible:outline-none sm:max-w-xs"
      >
        {clubs.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
        <option value={NEW_CLUB}>+ Criar outro clube</option>
      </select>
    </label>
  );
}
