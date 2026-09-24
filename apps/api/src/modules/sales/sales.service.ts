import type { SaleCreateInput, SaleUpdateInput, TransactionsListQuery } from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service.js';
import { HttpError } from '../../utils/http-error.js';
import { MetricsRepository } from '../metrics/metrics.repository.js';
import { calculateFifoMetrics } from '../metrics/metrics.service.js';
import { SalesRepository } from './sales.repository.js';

const repository = new SalesRepository();
const metricsRepository = new MetricsRepository();

export async function listSales(
  query: TransactionsListQuery,
  salesRepository: Pick<SalesRepository, 'findPage'> = repository,
  fifoRepository: Pick<MetricsRepository, 'getMovementData'> = metricsRepository,
) {
  const [{ items, total }, movementData] = await Promise.all([
    salesRepository.findPage(query),
    fifoRepository.getMovementData(),
  ]);
  const { cogsBySaleId, allocationsBySaleId } = calculateFifoMetrics(movementData);

  return {
    sales: items.map((sale) => {
      const revenue = Number(sale.totalSalePrice);
      const shippingCost = Number(sale.shippingCost);
      const netRevenueInCents = Math.round((revenue - shippingCost) * 100);
      const costInCents = Math.round(cogsBySaleId.get(sale.id) ?? 0);

      return {
        id: sale.id,
        productId: sale.productId,
        imageUrl: sale.imageKey ? getPublicUrl(sale.imageKey) : null,
        shortName: sale.shortName,
        totalSalePrice: revenue,
        shippingCost,
        profit: (netRevenueInCents - costInCents) / 100,
        profitBreakdown: {
          revenue,
          shippingCost,
          netRevenue: netRevenueInCents / 100,
          cost: costInCents / 100,
          allocations: (allocationsBySaleId.get(sale.id) ?? []).map((allocation) => ({
            source: allocation.componentName === null ? ('purchase' as const) : ('combo' as const),
            purchaseName: allocation.purchaseName,
            purchaseDate: allocation.purchaseDate.toISOString(),
            purchasePrice: allocation.purchasePriceInCents / 100,
            componentName: allocation.componentName,
            quantity: allocation.quantity,
            cost: Math.round(allocation.costInCents) / 100,
          })),
        },
        status: sale.status,
        date: sale.date.toISOString(),
      };
    }),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

function toSaleResponse(sale: {
  id: string;
  productId: string;
  totalSalePrice: string;
  shippingCost: string;
  status: string;
  date: Date;
}) {
  return {
    ...sale,
    totalSalePrice: Number(sale.totalSalePrice),
    shippingCost: Number(sale.shippingCost),
    date: sale.date.toISOString(),
  };
}

async function assertProductExists(
  productId: string,
  salesRepository: Pick<SalesRepository, 'findProduct'>,
) {
  if (!(await salesRepository.findProduct(productId))) {
    throw new HttpError('Product not found.', 404);
  }
}

export async function createSale(
  input: SaleCreateInput,
  salesRepository: Pick<SalesRepository, 'create' | 'findProduct'> = repository,
) {
  await assertProductExists(input.productId, salesRepository);
  const sale = await salesRepository.create(input);
  if (!sale) throw new Error('Sale creation did not return a sale.');
  return toSaleResponse(sale);
}

export async function updateSale(
  id: string,
  input: SaleUpdateInput,
  salesRepository: Pick<SalesRepository, 'findById' | 'findProduct' | 'update'> = repository,
) {
  const existingSale = await salesRepository.findById(id);
  if (!existingSale) throw new HttpError('Sale not found.', 404);

  await assertProductExists(input.productId ?? existingSale.productId, salesRepository);
  const sale = await salesRepository.update(id, input);
  if (!sale) throw new HttpError('Sale not found.', 404);
  return toSaleResponse(sale);
}

export async function deleteSale(
  id: string,
  salesRepository: Pick<SalesRepository, 'delete'> = repository,
) {
  if (!(await salesRepository.delete(id))) throw new HttpError('Sale not found.', 404);
}
