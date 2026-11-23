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
  { to: '/movimentacoes', label: 'Em aberto', icon: '🎲' },
  {
    to: '/mesas',
    label: 'Cash',
    icon: '♠️',
    roles: ['owner', 'manager', 'cashier', 'director', 'dealer'],
  },
  { to: '/caixa', label: 'Caixa', icon: '💰', roles: ['owner', 'manager', 'cashier'] },
  { to: '/jogadores', label: 'Jogadores', icon: '🃏' },
  { to: '/desfazer', label: 'Desfazer', icon: '↩️' },
  { to: '/equipe', label: 'Equipe', icon: '👥' },
  { to: '/configuracoes', label: 'Ajustes', icon: '⚙️', roles: ['owner', 'manager'] },
];

export function visibleNavItems(role: ClubRole, items: readonly NavItem[] = NAV_ITEMS): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

export const MOBILE_PRIMARY_COUNT = 4;

/** Celular: com até 5 itens mostra todos; acima disso, 4 atalhos + "Mais". */
export function splitMobileNav(items: readonly NavItem[]): {
  primary: NavItem[];
  overflow: NavItem[];
} {
  if (items.length <= MOBILE_PRIMARY_COUNT + 1) return { primary: [...items], overflow: [] };
  return {
    primary: items.slice(0, MOBILE_PRIMARY_COUNT),
    overflow: items.slice(MOBILE_PRIMARY_COUNT),
  };
}
