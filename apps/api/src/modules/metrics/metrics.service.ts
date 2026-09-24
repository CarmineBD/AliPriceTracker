import type { MetricsData, PurchaseMovementRow, SaleMovementRow } from './metrics.repository.js';
import { MetricsRepository } from './metrics.repository.js';

const repository = new MetricsRepository();

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(amount: number): number {
  return amount / 100;
}

type InventoryLot = {
  productId: string;
  remainingQuantity: number;
  unitCostInCents: number;
};

type ProductStock = {
  quantity: number;
  costInCents: number;
  averageSellingPriceInCents: number | null;
};

function groupByPurchase(rows: PurchaseMovementRow[]): PurchaseMovementRow[][] {
  const purchases = new Map<string, PurchaseMovementRow[]>();

  for (const row of rows) {
    const purchase = purchases.get(row.purchaseId) ?? [];
    purchase.push(row);
    purchases.set(row.purchaseId, purchase);
  }

  return [...purchases.values()];
}

/**
 * Expands received purchases into physical inventory lots. Combo costs are assigned using the
 * same selling-price share used by the average-purchase-price calculation.
 */
function createInventoryLots(rows: PurchaseMovementRow[]): InventoryLot[] {
  return groupByPurchase(rows).flatMap((purchaseRows) => {
    const purchase = purchaseRows[0];
    if (!purchase) return [];

    if (purchase.componentProductId === null) {
      return [
        {
          productId: purchase.productId,
          remainingQuantity: 1,
          unitCostInCents: toCents(Number(purchase.totalFinalPrice)),
        },
      ];
    }

    const components = purchaseRows.flatMap((row) => {
      if (
        row.componentProductId === null ||
        row.componentQuantity === null ||
        row.averageSellingPrice === null
      ) {
        return [];
      }

      return [
        {
          productId: row.componentProductId,
          quantity: row.componentQuantity,
          saleValueInCents: toCents(Number(row.averageSellingPrice)) * row.componentQuantity,
        },
      ];
    });

    // A partially priced combo cannot be assigned a component cost with the established rule.
    if (components.length !== purchaseRows.length) return [];

    const totalComponentSaleValueInCents = components.reduce(
      (total, component) => total + component.saleValueInCents,
      0,
    );
    if (totalComponentSaleValueInCents <= 0) return [];

    const purchaseCostInCents = toCents(Number(purchase.totalFinalPrice));
    return components.map((component) => ({
      productId: component.productId,
      remainingQuantity: component.quantity,
      unitCostInCents:
        (purchaseCostInCents * component.saleValueInCents) /
        totalComponentSaleValueInCents /
        component.quantity,
    }));
  });
}

function expandCompletedSales(rows: SaleMovementRow[]): Map<string, number> {
  const quantities = new Map<string, number>();

  for (const row of rows) {
    const productId = row.componentProductId ?? row.productId;
    const quantity = row.componentQuantity ?? 1;
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  return quantities;
}

export function calculateFifoMetrics({
  purchaseMovements,
  saleMovements,
}: Pick<MetricsData, 'purchaseMovements' | 'saleMovements'>) {
  const lots = createInventoryLots(purchaseMovements);
  const saleQuantities = expandCompletedSales(saleMovements);
  const cogsByProduct = new Map<string, number>();

  for (const [productId, quantitySold] of saleQuantities) {
    let quantityToAllocate = quantitySold;

    for (const lot of lots) {
      if (lot.productId !== productId || quantityToAllocate === 0) continue;

      const quantityAllocated = Math.min(lot.remainingQuantity, quantityToAllocate);
      cogsByProduct.set(
        productId,
        (cogsByProduct.get(productId) ?? 0) + quantityAllocated * lot.unitCostInCents,
      );
      lot.remainingQuantity -= quantityAllocated;
      quantityToAllocate -= quantityAllocated;
    }
  }

  const stockByProduct = new Map<string, ProductStock>();
  for (const lot of lots) {
    if (lot.remainingQuantity === 0) continue;

    const stock = stockByProduct.get(lot.productId) ?? {
      quantity: 0,
      costInCents: 0,
      averageSellingPriceInCents: null,
    };
    stock.quantity += lot.remainingQuantity;
    stock.costInCents += lot.remainingQuantity * lot.unitCostInCents;
    stockByProduct.set(lot.productId, stock);
  }

  // Selling prices are present on the purchase movements, including products acquired directly
  // and through combos. They are the same prices used for combo cost allocation.
  for (const row of purchaseMovements) {
    if (row.averageSellingPrice === null) continue;
    const stock = stockByProduct.get(row.componentProductId ?? row.productId);
    if (stock) stock.averageSellingPriceInCents = toCents(Number(row.averageSellingPrice));
  }

  const cogsInCents = [...cogsByProduct.values()].reduce((total, cost) => total + cost, 0);
  const stockCostValueInCents = [...stockByProduct.values()].reduce(
    (total, stock) => total + stock.costInCents,
    0,
  );
  const estimatedStockSaleValueInCents = [...stockByProduct.values()].reduce(
    (total, stock) =>
      total + stock.quantity * (stock.averageSellingPriceInCents ?? 0),
    0,
  );
  const roundedStockCostValueInCents = Math.round(stockCostValueInCents);
  const roundedEstimatedStockSaleValueInCents = Math.round(estimatedStockSaleValueInCents);
  const potentialStockProfitInCents =
    roundedEstimatedStockSaleValueInCents - roundedStockCostValueInCents;

  return {
    cogsInCents: Math.round(cogsInCents),
    stockCostValueInCents: roundedStockCostValueInCents,
    estimatedStockSaleValueInCents: roundedEstimatedStockSaleValueInCents,
    potentialStockProfitInCents,
  };
}

export async function getMetrics(
  metricsRepository: Pick<MetricsRepository, 'getMetricsData'> = repository,
) {
  const data = await metricsRepository.getMetricsData();
  const totalPurchases = fromCents(toCents(Number(data.totalPurchases)));
  const totalSales = fromCents(
    toCents(Number(data.totalSales)) - toCents(Number(data.totalShippingCosts)),
  );
  const fifo = calculateFifoMetrics(data);
  const completedSalesInCents = data.saleMovements
    .filter(
      (movement, index, movements) =>
        movements.findIndex((candidate) => candidate.saleId === movement.saleId) === index,
    )
    .reduce(
      (total, sale) =>
        total + toCents(Number(sale.totalSalePrice)) - toCents(Number(sale.shippingCost)),
      0,
    );
  const realizedProfitInCents = completedSalesInCents - fifo.cogsInCents;

  return {
    totalPurchases,
    totalSales,
    netCashFlow: fromCents(toCents(totalSales) - toCents(totalPurchases)),
    realizedProfit: fromCents(realizedProfitInCents),
    realizedRoi:
      fifo.cogsInCents === 0
        ? null
        : Math.round((realizedProfitInCents / fifo.cogsInCents) * 1000) / 10,
    stockCostValue: fromCents(fifo.stockCostValueInCents),
    estimatedStockSaleValue: fromCents(fifo.estimatedStockSaleValueInCents),
    potentialStockProfit: fromCents(fifo.potentialStockProfitInCents),
  };
}
