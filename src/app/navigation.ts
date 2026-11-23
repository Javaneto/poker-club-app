import type { ClubRole } from '@/features/clubs/domain/roles';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Sem `roles`: todos os papéis veem. */
  roles?: readonly ClubRole[];
}

/** Itens do menu. Os módulos das próximas fases entram aqui. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/movimentacoes', label: 'Em aberto', icon: '💰' },
  { to: '/jogadores', label: 'Jogadores', icon: '🃏' },
  { to: '/desfazer', label: 'Desfazer', icon: '↩️' },
  { to: '/equipe', label: 'Equipe', icon: '👥' },
];

export function visibleNavItems(role: ClubRole, items: readonly NavItem[] = NAV_ITEMS): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}
