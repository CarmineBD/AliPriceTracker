import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { StockRepository } from '../src/modules/stock/stock.repository.js';

describe('StockRepository', () => {
  it('expands direct combo components and aggregates only inventory-relevant statuses', async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const repository = new StockRepository({ execute } as never);

    await repository.findAll();

    const query = execute.mock.calls[0]?.[0] as SQL;
    const compiledSql = new PgDialect().sqlToQuery(query).sql;

    expect(compiledSql).toContain('WITH purchase_movements AS');
    expect(compiledSql).toContain('LEFT JOIN product_combos AS purchase_component');
    expect(compiledSql).toContain('COALESCE(purchase_component.quantity, 1)');
    expect(compiledSql).toContain("WHERE status = 'received'");
    expect(compiledSql).toContain("WHERE status = 'ordered'");
    expect(compiledSql).toContain("WHERE status = 'completed'");
    expect(compiledSql).toContain("WHERE status = 'to_be_sent'");
    expect(compiledSql).toContain('purchase_stock."receivedQuantity"');
    expect(compiledSql).toContain('sale_stock."completedQuantity"');
    expect(compiledSql).toContain('WHERE NOT EXISTS');
    expect(compiledSql).not.toContain("status IN ('ordered', 'received')");
  });
});
