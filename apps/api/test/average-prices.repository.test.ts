import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { AveragePricesRepository } from '../src/modules/average-prices/average-prices.repository.js';

describe('AveragePricesRepository', () => {
  it('weights estimated component costs by their quantities and sale-price share', async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const repository = new AveragePricesRepository({ execute } as never);

    await repository.findPurchases();

    const query = execute.mock.calls[0]?.[0] as SQL;
    const compiledSql = new PgDialect().sqlToQuery(query).sql;

    expect(compiledSql).toContain('sum(component_sale_prices.average_price * component.quantity)');
    expect(compiledSql).toContain('(average_price * quantity) / total_component_sale_value');
    expect(compiledSql).toContain('sum(purchase_costs.assigned_cost) / sum(purchase_costs.quantity)');
    expect(compiledSql).toContain('priced_component_count = component_count');
  });
});
