import type { ProfitHistory, ProfitHistoryPeriod } from '@alitracker/shared';

import { HttpError } from '../../utils/http-error.js';
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
  purchaseId: string;
  purchaseName: string;
  purchaseDate: Date;
  purchasePriceInCents: number;
  componentName: string | null;
};

export type FifoCostAllocation = {
  purchaseId: string;
  purchaseName: string;
  purchaseDate: Date;
  purchasePriceInCents: number;
  componentName: string | null;
  quantity: number;
  costInCents: number;
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

function groupBySale(rows: SaleMovementRow[]): SaleMovementRow[][] {
  const sales = new Map<string, SaleMovementRow[]>();

  for (const row of rows) {
    const sale = sales.get(row.saleId) ?? [];
    sale.push(row);
    sales.set(row.saleId, sale);
  }

  return [...sales.values()];
}

/**
 * Expands received purchases into physical inventory lots. Combo costs are assigned using the
 * same selling-price share used by the average-purchase-price calculation.
 */
function createInventoryLots(rows: PurchaseMovementRow[]): InventoryLot[] {
  return groupByPurchase(rows).flatMap((purchaseRows): InventoryLot[] => {
    const purchase = purchaseRows[0];
    if (!purchase) return [];

    if (purchase.componentProductId === null) {
      return [
        {
          productId: purchase.productId,
          remainingQuantity: 1,
          unitCostInCents: toCents(Number(purchase.totalFinalPrice)),
          purchaseId: purchase.purchaseId,
          purchaseName: purchase.purchaseProductShortName ?? purchase.productId,
          purchaseDate: purchase.date,
          purchasePriceInCents: toCents(Number(purchase.totalFinalPrice)),
          componentName: null,
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
          componentName: row.componentProductShortName ?? row.componentProductId,
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
      purchaseId: purchase.purchaseId,
      purchaseName: purchase.purchaseProductShortName ?? purchase.productId,
      purchaseDate: purchase.date,
      purchasePriceInCents: purchaseCostInCents,
      componentName: component.componentName,
    }));
  });
}

function allocateFifoCosts(lots: InventoryLot[], rows: SaleMovementRow[]) {
  const cogsBySaleId = new Map<string, number>();
  const allocationsBySaleId = new Map<string, FifoCostAllocation[]>();

  for (const saleRows of groupBySale(rows)) {
    const sale = saleRows[0];
    if (!sale) continue;

    let saleCogsInCents = 0;
    for (const row of saleRows) {
      const productId = row.componentProductId ?? row.productId;
      let quantityToAllocate = row.componentQuantity ?? 1;

      for (const lot of lots) {
        if (lot.productId !== productId || quantityToAllocate === 0) continue;

        const quantityAllocated = Math.min(lot.remainingQuantity, quantityToAllocate);
        if (quantityAllocated === 0) continue;

        saleCogsInCents += quantityAllocated * lot.unitCostInCents;
        const allocations = allocationsBySaleId.get(sale.saleId) ?? [];
        allocations.push({
          purchaseId: lot.purchaseId,
          purchaseName: lot.purchaseName,
          purchaseDate: lot.purchaseDate,
          purchasePriceInCents: lot.purchasePriceInCents,
          componentName: lot.componentName,
          quantity: quantityAllocated,
          costInCents: quantityAllocated * lot.unitCostInCents,
        });
        allocationsBySaleId.set(sale.saleId, allocations);
        lot.remainingQuantity -= quantityAllocated;
        quantityToAllocate -= quantityAllocated;
      }
    }

    cogsBySaleId.set(sale.saleId, saleCogsInCents);
  }

  return { cogsBySaleId, allocationsBySaleId };
}

export function calculateFifoMetrics({
  purchaseMovements,
  saleMovements,
}: Pick<MetricsData, 'purchaseMovements' | 'saleMovements'>) {
  const lots = createInventoryLots(purchaseMovements);
  const { cogsBySaleId, allocationsBySaleId } = allocateFifoCosts(lots, saleMovements);

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

  const cogsInCents = [...cogsBySaleId.values()].reduce((total, cost) => total + cost, 0);
  const stockCostValueInCents = [...stockByProduct.values()].reduce(
    (total, stock) => total + stock.costInCents,
    0,
  );
  const estimatedStockSaleValueInCents = [...stockByProduct.values()].reduce(
    (total, stock) => total + stock.quantity * (stock.averageSellingPriceInCents ?? 0),
    0,
  );
  const roundedStockCostValueInCents = Math.round(stockCostValueInCents);
  const roundedEstimatedStockSaleValueInCents = Math.round(estimatedStockSaleValueInCents);
  const potentialStockProfitInCents =
    roundedEstimatedStockSaleValueInCents - roundedStockCostValueInCents;

  return {
    cogsInCents: Math.round(cogsInCents),
    cogsBySaleId,
    allocationsBySaleId,
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
  const allSalesInCents = data.saleMovements
    .filter(
      (movement, index, movements) =>
        movements.findIndex((candidate) => candidate.saleId === movement.saleId) === index,
    )
    .reduce(
      (total, sale) =>
        total + toCents(Number(sale.totalSalePrice)) - toCents(Number(sale.shippingCost)),
      0,
    );
  const realizedProfitInCents = allSalesInCents - fifo.cogsInCents;
  const pendingSalesCount = data.saleMovements.filter(
    (movement, index, movements) =>
      movement.status !== 'completed' &&
      movements.findIndex((candidate) => candidate.saleId === movement.saleId) === index,
  ).length;

  return {
    totalPurchases,
    totalSales,
    netCashFlow: fromCents(toCents(totalSales) - toCents(totalPurchases)),
    realizedProfit: fromCents(realizedProfitInCents),
    pendingSalesCount,
    realizedRoi:
      fifo.cogsInCents === 0
        ? null
        : Math.round((realizedProfitInCents / fifo.cogsInCents) * 1000) / 10,
    stockCostValue: fromCents(fifo.stockCostValueInCents),
    estimatedStockSaleValue: fromCents(fifo.estimatedStockSaleValueInCents),
    potentialStockProfit: fromCents(fifo.potentialStockProfitInCents),
  };
}

type ProfitHistoryBucket = {
  salesCount: number;
  revenueInCents: number;
  cogsInCents: number;
};

function getProfitHistoryBounds(period: ProfitHistoryPeriod, now: Date, month?: string) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  if (period === 'month') {
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (month) {
      const [yearString, monthString] = month.split('-');
      const year = Number(yearString);
      const monthNumber = Number(monthString);
      if (
        !Number.isInteger(year) ||
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        throw new HttpError('El mes debe tener el formato YYYY-MM.', 400);
      }
      const selectedMonthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
      const earliestMonthStart = new Date(currentMonthStart);
      earliestMonthStart.setUTCMonth(earliestMonthStart.getUTCMonth() - 11);

      if (selectedMonthStart < earliestMonthStart || selectedMonthStart > currentMonthStart) {
        throw new HttpError('El mes debe estar dentro de los últimos 12 meses.', 400);
      }

      return {
        start: selectedMonthStart,
        end:
          selectedMonthStart.getTime() === currentMonthStart.getTime()
            ? end
            : new Date(Date.UTC(year, monthNumber, 1)),
      };
    }

    return { start: currentMonthStart, end };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  start.setUTCMonth(start.getUTCMonth() - 11);
  return { start, end };
}

function getProfitHistoryKey(date: Date, period: ProfitHistoryPeriod): string {
  return period === 'month' ? date.toISOString().slice(0, 10) : date.toISOString().slice(0, 7);
}

function getProfitHistoryPeriods(period: ProfitHistoryPeriod, start: Date, end: Date): Date[] {
  const periods: Date[] = [];
  const current = new Date(start);

  while (current < end) {
    periods.push(new Date(current));
    if (period === 'month') {
      current.setUTCDate(current.getUTCDate() + 1);
    } else {
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  }

  return periods;
}

function roundProfitHistoryRoi(profitInCents: number, cogsInCents: number): number | null {
  if (cogsInCents === 0) return null;
  return Math.round((profitInCents / cogsInCents) * 1000) / 10;
}

export async function getProfitHistory(
  period: ProfitHistoryPeriod,
  { month }: { month?: string } = {},
  metricsRepository: Pick<MetricsRepository, 'getMetricsData'> = repository,
  now = new Date(),
): Promise<ProfitHistory> {
  const data = await metricsRepository.getMetricsData();
  const fifo = calculateFifoMetrics(data);
  const { start, end } = getProfitHistoryBounds(period, now, month);
  const buckets = new Map<string, ProfitHistoryBucket>();

  for (const saleRows of groupBySale(data.saleMovements)) {
    const sale = saleRows[0];
    if (!sale || sale.date < start || sale.date >= end) continue;

    const key = getProfitHistoryKey(sale.date, period);
    const bucket = buckets.get(key) ?? { salesCount: 0, revenueInCents: 0, cogsInCents: 0 };
    bucket.salesCount += 1;
    bucket.revenueInCents +=
      toCents(Number(sale.totalSalePrice)) - toCents(Number(sale.shippingCost));
    bucket.cogsInCents += fifo.cogsBySaleId.get(sale.saleId) ?? 0;
    buckets.set(key, bucket);
  }

  let cumulativeProfitInCents = 0;
  const points = getProfitHistoryPeriods(period, start, end).map((periodStart) => {
    const bucket = buckets.get(getProfitHistoryKey(periodStart, period));
    const revenueInCents = bucket?.revenueInCents ?? 0;
    const cogsInCents = Math.round(bucket?.cogsInCents ?? 0);
    const profitInCents = revenueInCents - cogsInCents;
    cumulativeProfitInCents += profitInCents;

    return {
      date: periodStart.toISOString(),
      profit: fromCents(profitInCents),
      cumulativeProfit: fromCents(cumulativeProfitInCents),
      salesCount: bucket?.salesCount ?? 0,
      revenue: fromCents(revenueInCents),
      cogs: fromCents(cogsInCents),
    };
  });
  const totalRevenueInCents = points.reduce((total, point) => total + toCents(point.revenue), 0);
  const totalCogsInCents = points.reduce((total, point) => total + toCents(point.cogs), 0);
  const totalProfitInCents = totalRevenueInCents - totalCogsInCents;
  const totalSalesCount = points.reduce((total, point) => total + point.salesCount, 0);
  const periodsWithSales = points.filter((point) => point.salesCount > 0).length;

  return {
    period,
    points,
    summary: {
      profit: fromCents(totalProfitInCents),
      roi: roundProfitHistoryRoi(totalProfitInCents, totalCogsInCents),
      salesCount: totalSalesCount,
      revenue: fromCents(totalRevenueInCents),
      cogs: fromCents(totalCogsInCents),
      averageProfitPerSale:
        totalSalesCount === 0 ? null : fromCents(Math.round(totalProfitInCents / totalSalesCount)),
      averageProfitPerPeriodWithSales:
        periodsWithSales === 0
          ? null
          : fromCents(Math.round(totalProfitInCents / periodsWithSales)),
    },
  };
}
