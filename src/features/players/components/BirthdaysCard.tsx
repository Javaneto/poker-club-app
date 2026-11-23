import { Link } from 'react-router-dom';
import { useActiveClub } from '@/features/clubs/components/activeClubContext';
import { useUpcomingBirthdays } from '../api/usePlayers';
import { formatDayMonth } from '../domain/players';

const VISIBLE = 5;

/** Aniversariantes dos próximos 30 dias (some quando não há nenhum). */
export function BirthdaysCard() {
  const { club } = useActiveClub();
  const birthdays = useUpcomingBirthdays(club.id);
  const items = birthdays.data ?? [];

  if (items.length === 0) return null;

  return (
    <details className="border-border bg-surface rounded-lg border" open={items.length <= VISIBLE}>
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-3 font-medium">
        <span aria-hidden="true">🎂</span>
        Aniversariantes dos próximos 30 dias ({items.length})
      </summary>
      <ul className="divide-border divide-y border-t">
        {items.map((item) => (
          <li key={item.playerId}>
            <Link
              to={`/jogadores/${item.playerId}`}
              className="hover:bg-muted/50 flex min-h-11 items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="w-12 font-semibold tabular-nums">
                {formatDayMonth(item.nextBirthday)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {item.fullName}
                {item.nickname && <span className="text-muted-foreground"> · {item.nickname}</span>}
              </span>
              <span className="text-muted-foreground">{item.turningAge} anos</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
