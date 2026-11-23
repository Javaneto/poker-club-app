import { changedFields, rowSummary, tableLabel } from './describe';

describe('descrição do log', () => {
  it('traduz o nome da tabela', () => {
    expect(tableLabel('ledger_entries')).toBe('Lançamentos');
    expect(tableLabel('desconhecida')).toBe('desconhecida');
  });

  it('lista só campos que mudaram, sem colunas técnicas', () => {
    expect(
      changedFields(
        { full_name: 'Ana', phone: '1', updated_at: 'a', search_text: 'x' },
        { full_name: 'Ana', phone: '2', updated_at: 'b', search_text: 'y' },
      ),
    ).toEqual(['phone']);
    expect(changedFields(null, { a: 1 })).toEqual([]);
  });

  it('resume a linha pelo nome quando existe', () => {
    expect(rowSummary(null, { full_name: 'Ana Costa' }, 'abc')).toBe('Ana Costa');
    expect(rowSummary({ name: 'Clube X' }, null, 'abc')).toBe('Clube X');
    expect(rowSummary(null, { foo: 1 }, '1234567890')).toBe('12345678');
    expect(rowSummary(null, { foo: 1 }, '{"club_id":"x"}')).toBe('—');
  });

  it('descreve lançamentos, papéis e sessões', () => {
    expect(
      rowSummary(null, { kind: 'payment_in', amount_cents: 5000 }, 'x').replaceAll(
        String.fromCharCode(160),
        ' ',
      ),
    ).toBe('Pagamento R$ 50,00');
    expect(rowSummary(null, { role: 'cashier' }, null)).toBe('Papel: Caixa');
    expect(rowSummary(null, { status: 'closed' }, 'x')).toBe('Sessão finalizada');
  });
});
