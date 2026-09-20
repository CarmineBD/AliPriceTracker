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

export async function listOpportunities(
  query: OpportunitiesListQuery,
  currentTime = new Date(),
  repositories: OpportunityServiceRepositories = defaultRepositories,
): Promise<{
  opportunities: Opportunity[];
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
  opportunities.sort(sortByRoiDescending);

  const total = opportunities.length;
  const offset = (query.page - 1) * query.pageSize;
  return {
    opportunities: opportunities.slice(offset, offset + query.pageSize),
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
): Promise<{ combinations: Array<{ coupon: MoneyCoupon; options: Opportunity[] }> }> {
  const { offers, componentsByProductId, coupons } = await getOpportunityData(
    query.couponIds,
    currentTime,
    repositories,
  );

  const combinations = coupons.flatMap((coupon) => {
    const options = offers
      .flatMap((offer) => {
        if (offer.price === null || toCents(Number(offer.price)) < toCents(coupon.minPurchase)) {
          return [];
        }
        const opportunity = createOpportunity(offer, componentsByProductId, coupon, null);
        return opportunity === null || opportunity.roi === null ? [] : [opportunity];
      })
      .sort(sortByRoiDescending)
      .slice(0, 3);

    return options.length > 0 ? [{ coupon, options }] : [];
  });

  combinations.sort(sortByCouponDescending);

  return { combinations };
}
