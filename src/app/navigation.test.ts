import { visibleNavItems, type NavItem } from './navigation';

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
