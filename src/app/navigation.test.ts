import { splitMobileNav, visibleNavItems, type NavItem } from './navigation';

const items: NavItem[] = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/caixa', label: 'Caixa', icon: '💰', roles: ['owner', 'cashier'] },
];

describe('visibleNavItems', () => {
  it('mostra itens sem restrição para todos', () => {
    expect(visibleNavItems('dealer', items).map((item) => item.to)).toEqual(['/']);
  });

  it('mostra itens restritos só para os papéis permitidos', () => {
    expect(visibleNavItems('cashier', items).map((item) => item.to)).toEqual(['/', '/caixa']);
  });
});

describe('splitMobileNav', () => {
  const make = (count: number): NavItem[] =>
    Array.from({ length: count }, (_, index) => ({
      to: `/${index}`,
      label: `${index}`,
      icon: '•',
    }));

  it('mostra todos quando cabem (até 5)', () => {
    expect(splitMobileNav(make(5))).toEqual({ primary: make(5), overflow: [] });
  });

  it('manda o excedente para "Mais"', () => {
    const { primary, overflow } = splitMobileNav(make(7));
    expect(primary).toHaveLength(4);
    expect(overflow.map((item) => item.to)).toEqual(['/4', '/5', '/6']);
  });
});
