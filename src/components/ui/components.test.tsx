import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { Tabs } from './Tabs';
import { Toaster } from './Toaster';
import { toast, useToastStore } from './toastStore';

describe('Input', () => {
  it('liga rótulo e mensagem de erro ao campo', () => {
    render(<Input label="Nome" error="Obrigatório" />);
    const field = screen.getByLabelText('Nome');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Obrigatório');
  });
});

describe('Modal', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Abrir</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Confirmar">
          Conteúdo
        </Modal>
      </>
    );
  }

  it('abre, e fecha com Esc', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fecha pelo botão', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Tabs', () => {
  function Harness() {
    const [value, setValue] = useState('a');
    return (
      <Tabs
        value={value}
        onValueChange={setValue}
        items={[
          { value: 'a', label: 'Aba A', content: 'Painel A' },
          { value: 'b', label: 'Aba B', content: 'Painel B' },
        ]}
      />
    );
  }

  it('troca de aba por clique e por seta', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Painel A');
    await user.click(screen.getByRole('tab', { name: 'Aba B' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Painel B');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Aba A' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Toaster', () => {
  afterEach(() => useToastStore.setState({ toasts: [] }));

  it('mostra erro como alerta e permite fechar', async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      toast.error('Falhou ao salvar');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou ao salvar');
    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
