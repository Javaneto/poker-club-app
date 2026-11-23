import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { splitMobileNav, type NavItem } from './navigation';

const itemClass = (active: boolean) =>
  cn(
    'flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium',
    active ? 'text-primary' : 'text-muted-foreground',
  );

/** Barra inferior do celular: até 4 atalhos + "Mais" (gaveta com o restante). */
export function MobileNav({ items }: { items: NavItem[] }) {
  const { primary, overflow } = splitMobileNav(items);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const overflowActive = overflow.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      <nav
        aria-label="Menu principal"
        className="border-border bg-surface fixed inset-x-0 bottom-0 z-30 flex border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => itemClass(isActive)}
          >
            <span aria-hidden="true" className="text-lg">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button type="button" className={itemClass(overflowActive)} onClick={() => setOpen(true)}>
            <span aria-hidden="true" className="text-lg">
              ☰
            </span>
            Mais
          </button>
        )}
      </nav>

      <Modal open={open} onClose={() => setOpen(false)} title="Menu">
        <ul className="flex flex-col gap-1">
          {overflow.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex h-12 items-center gap-3 rounded-lg px-3 font-medium',
                    isActive ? 'bg-muted' : 'hover:bg-muted',
                  )
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
