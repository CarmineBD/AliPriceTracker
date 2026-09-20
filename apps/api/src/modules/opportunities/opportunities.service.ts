import type {
  BestCouponCombinationsListQuery,
  Coupon,
  CouponCategory,
  OpportunitiesListQuery,
} from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service.js';
import { EventsRepository } from '../events/events.repository.js';
import {
  OpportunitiesRepository,
  type CurrentProductOffer,
  type ProductComboComponent,
} from './opportunities.repository.js';

type MoneyCoupon = Pick<Coupon, 'id' | 'minPurchase' | 'discountAmount' | 'category'>;

export type Opportunity = {
  productId: string;
  imageUrl: string | null;
  name: string;
  shortName: string;
  basePurchasePrice: number;
  currency: string | null;
  coupon: MoneyCoupon | null;
  effectivePurchasePrice: number;
  estimatedSellingPrice: number;
  estimatedProfit: number;
  roi: number | null;
  nextCoupon: MoneyCoupon | null;
  amountToNextCoupon: number | null;
  stock: number | null;
  offerUrl: string | null;
  offerObservedAt: string;
};

export type BestCouponCombination = {
  coupon: MoneyCoupon;
  isCombo: boolean;
  products: Opportunity[];
  basePurchasePrice: number;
  effectivePurchasePrice: number;
  estimatedSellingPrice: number;
  estimatedProfit: number;
  roi: number;
};

type PurchasableProduct = {
  offer: CurrentProductOffer;
  basePurchasePrice: number;
  estimatedSellingPrice: number;
};

export type OpportunityServiceRepositories = {
  opportunities: Pick<
    OpportunitiesRepository,
    'findProductsWithCurrentOffers' | 'findComboComponents'
  >;
  events: Pick<EventsRepository, 'findActiveWithCoupons' | 'findCouponOptions'>;
};

const opportunitiesRepository = new OpportunitiesRepository();
const eventsRepository = new EventsRepository();

const defaultRepositories: OpportunityServiceRepositories = {
  opportunities: opportunitiesRepository,
  events: eventsRepository,
};

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(amount: number): number {
  return amount / 100;
}

function toCoupon(coupon: {
  id: string;
  minPurchase: string;
  discountAmount: string;
  category: CouponCategory | null;
}): MoneyCoupon {
  return {
    id: coupon.id,
    minPurchase: Number(coupon.minPurchase),
    discountAmount: Number(coupon.discountAmount),
    category: coupon.category,
  };
}

function compareCouponIds(left: MoneyCoupon, right: MoneyCoupon): number {
  return left.id.localeCompare(right.id);
}

/** Returns the eligible coupon with the greatest discount, deterministically breaking ties by id. */
export function findBestApplicableCoupon(
  price: number,
  coupons: MoneyCoupon[],
): MoneyCoupon | null {
  const priceInCents = toCents(price);
  let best: MoneyCoupon | null = null;

  for (const coupon of coupons) {
    if (toCents(coupon.minPurchase) > priceInCents) continue;
    if (
      best === null ||
      toCents(coupon.discountAmount) > toCents(best.discountAmount) ||
      (toCents(coupon.discountAmount) === toCents(best.discountAmount) &&
        compareCouponIds(coupon, best) < 0)
    ) {
      best = coupon;
    }
  }

  return best;
}

/** Returns the closest threshold that has not yet been reached. */
export function findNextCoupon(price: number, coupons: MoneyCoupon[]): MoneyCoupon | null {
  const priceInCents = toCents(price);
  let next: MoneyCoupon | null = null;

  for (const coupon of coupons) {
    const minimumInCents = toCents(coupon.minPurchase);
    if (minimumInCents <= priceInCents) continue;
    if (
      next === null ||
      minimumInCents < toCents(next.minPurchase) ||
      (minimumInCents === toCents(next.minPurchase) && compareCouponIds(coupon, next) < 0)
    ) {
      next = coupon;
    }
  }

  return next;
}

export function resolveEstimatedSellingPrice(
  product: Pick<CurrentProductOffer, 'productId' | 'averageSellingPrice'>,
  componentsByProductId: ReadonlyMap<string, ProductComboComponent[]>,
): number | null {
  const components = componentsByProductId.get(product.productId);
  const fallback =
    product.averageSellingPrice === null ? null : Number(product.averageSellingPrice);

  if (!components || components.length === 0) return fallback;
  if (components.some((component) => component.averageSellingPrice === null)) return fallback;

  return fromCents(
    components.reduce(
      (total, component) =>
        total + toCents(Number(component.averageSellingPrice)) * component.quantity,
      0,
    ),
  );
}

export function calculateProfit(
  estimatedSellingPrice: number,
  effectivePurchasePrice: number,
): number {
  return fromCents(toCents(estimatedSellingPrice) - toCents(effectivePurchasePrice));
}

export function calculateRoi(
  estimatedProfit: number,
  effectivePurchasePrice: number,
): number | null {
  if (!Number.isFinite(effectivePurchasePrice) || effectivePurchasePrice <= 0) return null;
  return Math.round((estimatedProfit / effectivePurchasePrice) * 10_000) / 100;
}

function groupComponentsByProductId(components: ProductComboComponent[]) {
  const componentsByProductId = new Map<string, ProductComboComponent[]>();
  for (const component of components) {
    const productComponents = componentsByProductId.get(component.productId) ?? [];
    productComponents.push(component);
    componentsByProductId.set(component.productId, productComponents);
  }
  return componentsByProductId;
}

function filterAvailableCoupons(coupons: MoneyCoupon[], couponIds: string[] | undefined) {
  if (!couponIds) return coupons;

  const availableCouponIds = new Set(couponIds);
  return coupons.filter((coupon) => availableCouponIds.has(coupon.id));
}

function sortByRoiDescending(left: Opportunity, right: Opportunity): number {
  if (left.roi === null && right.roi !== null) return 1;
  if (left.roi !== null && right.roi === null) return -1;
  if (left.roi !== null && right.roi !== null && left.roi !== right.roi) {
    return right.roi - left.roi;
  }

  return left.name.localeCompare(right.name) || left.productId.localeCompare(right.productId);
}

function sortCombinationsByRoiDescending(
  left: BestCouponCombination,
  right: BestCouponCombination,
): number {
  if (left.roi !== right.roi) return right.roi - left.roi;
  if (left.estimatedProfit !== right.estimatedProfit) {
    return right.estimatedProfit - left.estimatedProfit;
  }
  return left.coupon.id.localeCompare(right.coupon.id);
}

function sortByCouponDescending(
  left: { coupon: MoneyCoupon },
  right: { coupon: MoneyCoupon },
): number {
  const discountDifference =
    toCents(right.coupon.discountAmount) - toCents(left.coupon.discountAmount);
  if (discountDifference !== 0) return discountDifference;

  const minimumPurchaseDifference =
    toCents(right.coupon.minPurchase) - toCents(left.coupon.minPurchase);
  if (minimumPurchaseDifference !== 0) return minimumPurchaseDifference;

  return compareCouponIds(left.coupon, right.coupon);
}

async function getOpportunityData(
  couponIds: string[] | undefined,
  currentTime: Date,
  repositories: OpportunityServiceRepositories,
) {
  const [offers, components, activeEvents, couponOptions] = await Promise.all([
    repositories.opportunities.findProductsWithCurrentOffers(),
    repositories.opportunities.findComboComponents(),
    repositories.events.findActiveWithCoupons(currentTime),
    couponIds === undefined ? Promise.resolve(undefined) : repositories.events.findCouponOptions(),
  ]);
  const activeEvent = activeEvents[0];

  return {
    offers,
    componentsByProductId: groupComponentsByProductId(components),
    coupons: filterAvailableCoupons(
      couponOptions
        ? couponOptions.map(toCoupon)
        : activeEvent
          ? activeEvent.coupons.map(toCoupon)
          : [],
      couponIds,
    ),
  };
}

function createOpportunity(
  offer: CurrentProductOffer,
  componentsByProductId: ReadonlyMap<string, ProductComboComponent[]>,
  coupon: MoneyCoupon | null,
  nextCoupon: MoneyCoupon | null,
): Opportunity | null {
  if (!offer.isAvailable || offer.price === null) return null;

  const basePurchasePrice = Number(offer.price);
  const estimatedSellingPrice = resolveEstimatedSellingPrice(offer, componentsByProductId);
  if (!Number.isFinite(basePurchasePrice) || estimatedSellingPrice === null) return null;

  const effectivePurchasePrice = fromCents(
    toCents(basePurchasePrice) - toCents(coupon?.discountAmount ?? 0),
  );
  const estimatedProfit = calculateProfit(estimatedSellingPrice, effectivePurchasePrice);
  if (estimatedProfit <= 0) return null;

  return {
    productId: offer.productId,
    imageUrl: offer.imageKey ? getPublicUrl(offer.imageKey) : offer.iconUrl,
    name: offer.name,
    shortName: offer.shortName,
    basePurchasePrice,
    currency: offer.currency,
    coupon,
    effectivePurchasePrice,
    estimatedSellingPrice,
    estimatedProfit,
    roi: calculateRoi(estimatedProfit, effectivePurchasePrice),
    nextCoupon,
    amountToNextCoupon: nextCoupon
      ? fromCents(toCents(nextCoupon.minPurchase) - toCents(basePurchasePrice))
      : null,
    stock: offer.quantityAvailable,
    offerUrl: offer.publicationUrl,
    offerObservedAt: offer.capturedAt.toISOString(),
  };
}

function toPurchasableProduct(
  offer: CurrentProductOffer,
  componentsByProductId: ReadonlyMap<string, ProductComboComponent[]>,
): PurchasableProduct | null {
  if (!offer.isAvailable || offer.price === null) return null;

  const basePurchasePrice = Number(offer.price);
  const estimatedSellingPrice = resolveEstimatedSellingPrice(offer, componentsByProductId);
  if (!Number.isFinite(basePurchasePrice) || estimatedSellingPrice === null) return null;

  return { offer, basePurchasePrice, estimatedSellingPrice };
}

/** Splits the coupon in cents so product-level totals always add up to the combo total. */
function allocateCouponDiscount(products: PurchasableProduct[], discountInCents: number): number[] {
  const totalInCents = products.reduce(
    (total, product) => total + toCents(product.basePurchasePrice),
    0,
  );
  let allocated = 0;

  return products.map((product, index) => {
    if (index === products.length - 1) return discountInCents - allocated;

    const share = Math.floor((toCents(product.basePurchasePrice) * discountInCents) / totalInCents);
    allocated += share;
    return share;
  });
}

function createPurchaseOption(
  selectedProducts: PurchasableProduct[],
  coupon: MoneyCoupon,
): BestCouponCombination | null {
  const basePurchasePrice = fromCents(
    selectedProducts.reduce((total, product) => total + toCents(product.basePurchasePrice), 0),
  );
  if (toCents(basePurchasePrice) < toCents(coupon.minPurchase)) return null;

  const estimatedSellingPrice = fromCents(
    selectedProducts.reduce((total, product) => total + toCents(product.estimatedSellingPrice), 0),
  );
  const effectivePurchasePrice = fromCents(
    toCents(basePurchasePrice) - toCents(coupon.discountAmount),
  );
  const estimatedProfit = calculateProfit(estimatedSellingPrice, effectivePurchasePrice);
  const roi = calculateRoi(estimatedProfit, effectivePurchasePrice);
  if (estimatedProfit <= 0 || roi === null) return null;

  const discounts = allocateCouponDiscount(selectedProducts, toCents(coupon.discountAmount));
  const products = selectedProducts.map((product, index): Opportunity => {
    const effectivePrice = fromCents(toCents(product.basePurchasePrice) - (discounts[index] ?? 0));
    const profit = calculateProfit(product.estimatedSellingPrice, effectivePrice);

    return {
      productId: product.offer.productId,
      imageUrl: product.offer.imageKey
        ? getPublicUrl(product.offer.imageKey)
        : product.offer.iconUrl,
      name: product.offer.name,
      shortName: product.offer.shortName,
      basePurchasePrice: product.basePurchasePrice,
      currency: product.offer.currency,
      coupon,
      effectivePurchasePrice: effectivePrice,
      estimatedSellingPrice: product.estimatedSellingPrice,
      estimatedProfit: profit,
      roi: calculateRoi(profit, effectivePrice),
      nextCoupon: null,
      amountToNextCoupon: null,
      stock: product.offer.quantityAvailable,
      offerUrl: product.offer.publicationUrl,
      offerObservedAt: product.offer.capturedAt.toISOString(),
    };
  });

  return {
    coupon,
    isCombo: products.length > 1,
    products,
    basePurchasePrice,
    effectivePurchasePrice,
    estimatedSellingPrice,
    estimatedProfit,
    roi,
  };
}

function isBetterPurchaseOption(
  candidate: BestCouponCombination,
  current: BestCouponCombination | null,
): boolean {
  if (current === null || candidate.roi !== current.roi)
    return current === null || candidate.roi > current.roi;
  if (candidate.estimatedProfit !== current.estimatedProfit) {
    return candidate.estimatedProfit > current.estimatedProfit;
  }
  if (candidate.basePurchasePrice !== current.basePurchasePrice) {
    return candidate.basePurchasePrice < current.basePurchasePrice;
  }
  return (
    candidate.products
      .map((product) => product.productId)
      .join(',')
      .localeCompare(current.products.map((product) => product.productId).join(',')) < 0
  );
}

/**
 * Finds the exact highest-ROI use of one coupon in memory. It reuses the current-offer query and
 * prunes branches whose remaining products cannot reach the coupon threshold.
 */
function findBestCouponPurchases(
  products: PurchasableProduct[],
  coupon: MoneyCoupon,
): { best: BestCouponCombination | null; bestCombo: BestCouponCombination | null } {
  const sortedProducts = [...products].sort((left, right) =>
    left.offer.productId.localeCompare(right.offer.productId),
  );
  const suffixPrices = new Array<number>(sortedProducts.length + 1).fill(0);
  for (let index = sortedProducts.length - 1; index >= 0; index -= 1) {
    suffixPrices[index] =
      (suffixPrices[index + 1] ?? 0) + toCents(sortedProducts[index]!.basePurchasePrice);
  }

  const minimumInCents = toCents(coupon.minPurchase);
  let best: BestCouponCombination | null = null;
  let bestCombo: BestCouponCombination | null = null;

  const visit = (startIndex: number, selected: PurchasableProduct[], totalInCents: number) => {
    if (totalInCents + (suffixPrices[startIndex] ?? 0) < minimumInCents) return;

    if (selected.length > 0 && totalInCents >= minimumInCents) {
      const option = createPurchaseOption(selected, coupon);
      if (option && isBetterPurchaseOption(option, best)) best = option;
      if (option && option.isCombo && isBetterPurchaseOption(option, bestCombo)) bestCombo = option;
    }

    for (let index = startIndex; index < sortedProducts.length; index += 1) {
      const product = sortedProducts[index]!;
      visit(index + 1, [...selected, product], totalInCents + toCents(product.basePurchasePrice));
    }
  };

  visit(0, [], 0);
  return { best, bestCombo };
}

export async function listOpportunities(
  query: OpportunitiesListQuery,
  currentTime = new Date(),
  repositories: OpportunityServiceRepositories = defaultRepositories,
): Promise<{
  opportunities: Opportunity[];
  comboOpportunities: BestCouponCombination[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const { offers, componentsByProductId, coupons } = await getOpportunityData(
    query.couponIds,
    currentTime,
    repositories,
  );

  const opportunities = offers.flatMap((offer) => {
    if (offer.price === null) return [];
    const basePurchasePrice = Number(offer.price);
    const coupon = findBestApplicableCoupon(basePurchasePrice, coupons);
    const nextCoupon = findNextCoupon(basePurchasePrice, coupons);
    const opportunity = createOpportunity(offer, componentsByProductId, coupon, nextCoupon);
    return opportunity ? [opportunity] : [];
  });
  const purchasableProducts = offers.flatMap((offer) => {
    const product = toPurchasableProduct(offer, componentsByProductId);
    return product ? [product] : [];
  });
  const couponPurchases = coupons.map((coupon) =>
    findBestCouponPurchases(purchasableProducts, coupon),
  );
  const comboOpportunities = couponPurchases.flatMap((purchases) =>
    purchases.bestCombo ? [purchases.bestCombo] : [],
  );
  opportunities.sort(sortByRoiDescending);
  comboOpportunities.sort(sortCombinationsByRoiDescending);

  const total = opportunities.length;
  const offset = (query.page - 1) * query.pageSize;
  return {
    opportunities: opportunities.slice(offset, offset + query.pageSize),
    comboOpportunities,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function listBestCouponCombinations(
  query: BestCouponCombinationsListQuery,
  currentTime = new Date(),
  repositories: OpportunityServiceRepositories = defaultRepositories,
): Promise<{ combinations: BestCouponCombination[] }> {
  const { offers, componentsByProductId, coupons } = await getOpportunityData(
    query.couponIds,
    currentTime,
    repositories,
  );

  const purchasableProducts = offers.flatMap((offer) => {
    const product = toPurchasableProduct(offer, componentsByProductId);
    return product ? [product] : [];
  });
  const combinations = coupons.flatMap((coupon) => {
    const { best } = findBestCouponPurchases(purchasableProducts, coupon);
    return best ? [best] : [];
  });

  combinations.sort(sortByCouponDescending);

  return { combinations };
}
