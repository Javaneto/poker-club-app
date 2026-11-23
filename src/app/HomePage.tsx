import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toastStore';
import { formatCents } from '@/lib/money';
import { useTheme } from './useTheme';

/** Página provisória da Fase 1: mostra os componentes base. Substituída na Fase 3. */
export function HomePage() {
  const { theme, toggle } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState('components');

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Clube de Poker</h1>
        <Button variant="secondary" onClick={toggle}>
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </Button>
      </header>

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: 'components',
            label: 'Componentes',
            content: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
                  <Button variant="secondary" onClick={() => toast.success('Salvo com sucesso.')}>
                    Mostrar aviso
                  </Button>
                  <Button variant="danger" onClick={() => toast.error('Não foi possível salvar.')}>
                    Mostrar erro
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Badge>Neutro</Badge>
                  <Badge tone="success">Pago</Badge>
                  <Badge tone="warning">Pendente</Badge>
                  <Badge tone="danger">Devendo</Badge>
                </div>
                <Input label="Nome" placeholder="Nome do jogador" />
                <Select
                  label="Forma de pagamento"
                  placeholder="Selecione"
                  options={[
                    { value: 'cash', label: 'Dinheiro' },
                    { value: 'pix', label: 'PIX' },
                  ]}
                />
              </div>
            ),
          },
          {
            value: 'table',
            label: 'Tabela',
            content: (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Jogador</TableHeaderCell>
                    <TableHeaderCell className="text-right">Saldo</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Jogador A</TableCell>
                    <TableCell className="text-right">{formatCents(15_000)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Jogador B</TableCell>
                    <TableCell className="text-right">{formatCents(-4_250)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Exemplo de modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirmar</Button>
          </>
        }
      >
        <p>No celular este modal abre como bottom sheet.</p>
      </Modal>
    </main>
  );
}
