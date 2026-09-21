import type { SaleCreateInput, SaleUpdateInput, TransactionsListQuery } from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service.js';
import { HttpError } from '../../utils/http-error.js';
import { SalesRepository } from './sales.repository.js';

const repository = new SalesRepository();

export async function listSales(
  query: TransactionsListQuery,
  salesRepository: Pick<SalesRepository, 'findPage'> = repository,
) {
  const { items, total } = await salesRepository.findPage(query);
  return {
    sales: items.map((sale) => ({
      id: sale.id,
      productId: sale.productId,
      imageUrl: sale.imageKey ? getPublicUrl(sale.imageKey) : null,
      shortName: sale.shortName,
      totalSalePrice: Number(sale.totalSalePrice),
      status: sale.status,
      date: sale.date.toISOString(),
    })),
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
  status: string;
  date: Date;
}) {
  return {
    ...sale,
    totalSalePrice: Number(sale.totalSalePrice),
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
