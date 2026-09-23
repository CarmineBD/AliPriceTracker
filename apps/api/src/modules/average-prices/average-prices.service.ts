import type { AveragePrices } from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service.js';
import { AveragePricesRepository, type AveragePriceRow } from './average-prices.repository.js';

const repository = new AveragePricesRepository();

type AveragePricesRepositoryPort = Pick<
  AveragePricesRepository,
  'findComboSales' | 'findPurchases' | 'findSales'
>;

function toAveragePriceItem(item: AveragePriceRow) {
  return {
    productId: item.productId,
    imageUrl: item.imageKey ? getPublicUrl(item.imageKey) : null,
    shortName: item.shortName,
    averagePrice: Number(item.averagePrice),
  };
}

export async function listAveragePrices(
  repositoryOverride: AveragePricesRepositoryPort = repository,
): Promise<AveragePrices> {
  const [sales, comboSales, purchases] = await Promise.all([
    repositoryOverride.findSales(),
    repositoryOverride.findComboSales(),
    repositoryOverride.findPurchases(),
  ]);

  return {
    sales: [...sales, ...comboSales]
      .sort((left, right) =>
        left.shortName.localeCompare(right.shortName) || left.productId.localeCompare(right.productId),
      )
      .map(toAveragePriceItem),
    purchases: purchases.map(toAveragePriceItem),
  };
}
