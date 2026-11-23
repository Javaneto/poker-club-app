import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyPlayerForm } from '../schemas';
import { PlayerForm } from './PlayerForm';

function setup() {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <PlayerForm
      defaultValues={emptyPlayerForm}
      submitLabel="Cadastrar"
      pending={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel, user: userEvent.setup() };
}

describe('PlayerForm', () => {
  it('mostra erros em pt-BR e não envia dados inválidos', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('CPF'), '52998224724');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Informe o nome completo')).toBeInTheDocument();
    expect(screen.getByText('CPF inválido')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('formata telefone ao sair do campo e envia só os dígitos', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Nome completo *'), 'Ana Costa');
    const phone = screen.getByLabelText('Telefone (com DDD)');
    await user.type(phone, '11987654321');
    await user.tab();
    expect(phone).toHaveValue('(11) 98765-4321');

    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      fullName: 'Ana Costa',
      phone: '11987654321',
      cpf: null,
    });
  });

  it('cancela sem enviar', async () => {
    const { onSubmit, onCancel, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
