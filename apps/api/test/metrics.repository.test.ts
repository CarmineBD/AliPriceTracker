import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { MetricsRepository } from '../src/modules/metrics/metrics.repository.js';

describe('MetricsRepository', () => {
  it('uses a configured selling price when a combo component has no sale history', async () => {
    const queryBuilder = {
      from: vi.fn(),
      groupBy: vi.fn(),
      as: vi.fn(),
      innerJoin: vi.fn(),
      leftJoin: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
    };
    for (const method of ['from', 'groupBy', 'innerJoin', 'leftJoin', 'where'] as const) {
      queryBuilder[method].mockReturnValue(queryBuilder);
    }
    queryBuilder.as.mockReturnValue({});
    queryBuilder.orderBy.mockResolvedValue([]);
    const select = vi.fn(() => queryBuilder);
    const repository = new MetricsRepository({ select } as never);

    await repository.getMovementData();

    const purchaseSelection = select.mock.calls[2]?.[0] as {
      averageSellingPrice: SQL;
    };
    const compiledSql = new PgDialect().sqlToQuery(purchaseSelection.averageSellingPrice).sql;

    expect(compiledSql).toContain('COALESCE');
    expect(compiledSql).toContain('metrics_component_sale_prices');
    expect(compiledSql).toContain('"metrics_component_products"."average_selling_price"');
  });
});
