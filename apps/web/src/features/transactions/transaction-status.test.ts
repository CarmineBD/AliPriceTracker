import { describe, expect, it } from 'vitest';

import { getTransactionStatusOptions } from './transaction-status';

describe('getTransactionStatusOptions', () => {
  it('returns the status choices displayed for each transaction type', () => {
    expect(getTransactionStatusOptions('purchase')).toEqual([
      { value: 'ordered', label: 'Pedido' },
      { value: 'received', label: 'Recibido' },
      { value: 'returned', label: 'Devuelto' },
    ]);
    expect(getTransactionStatusOptions('sale')).toEqual([
      { value: 'to_be_sent', label: 'Por enviar' },
      { value: 'sent', label: 'Enviado' },
      { value: 'completed', label: 'Completado' },
    ]);
  });
});
