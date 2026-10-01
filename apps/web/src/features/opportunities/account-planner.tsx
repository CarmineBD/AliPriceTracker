import { useEffect, useState } from 'react';

import type { Coupon, Opportunity, Product, ProductOption } from '@alitracker/shared';
import { ImageOff, Plus, Trash2, X } from 'lucide-react';
import { z } from 'zod';

import { CouponDiscountBadge } from '@/components/coupon-discount-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductCombobox } from '@/features/products/product-combobox';

const storageKey = 'alitracker.opportunities.account-planner.v1';

const persistedAccountSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(120),
  productIds: z.array(z.string().min(1)).max(100),
  itemIds: z.array(z.string().min(1)).max(100).default([]),
  couponByProductId: z.record(z.string().min(1), z.string().min(1)).default({}),
});

const persistedPlannerSchema = z.object({ accounts: z.array(persistedAccountSchema).max(100) });

type PlannerAccount = z.infer<typeof persistedAccountSchema>;

type AccountPlannerProps = {
  opportunities: Opportunity[];
  coupons: Coupon[];
  productDetailsById?: ReadonlyMap<string, Product>;
};

type PlannedItem = {
  id: string;
  opportunity: Opportunity;
  coupon: Coupon | null;
  effectivePurchasePrice: number;
  estimatedProfit: number;
  roi: number | null;
};

const amountFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const roiFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

function formatEuro(amount: number): string {
  return `${amountFormatter.format(amount)} €`;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(amount: number): number {
  return amount / 100;
}

function getOfferCapacity(offer: Product['offers'][number]): number {
  if (offer.price === null || offer.quantityAvailable <= 0) return 0;
  return offer.maxPurchase > 1
    ? Math.min(offer.quantityAvailable, offer.maxPurchase)
    : 1;
}

function findBestAvailableCoupon(
  price: number,
  coupons: Coupon[],
  usedCouponIds: ReadonlySet<string>,
): Coupon | null {
  const priceInCents = toCents(price);
  return coupons.reduce<Coupon | null>((best, coupon) => {
    if (usedCouponIds.has(coupon.id) || toCents(coupon.minPurchase) > priceInCents) return best;
    if (
      best === null ||
      toCents(coupon.discountAmount) > toCents(best.discountAmount) ||
      (toCents(coupon.discountAmount) === toCents(best.discountAmount) && coupon.id < best.id)
    ) {
      return coupon;
    }
    return best;
  }, null);
}

function getAccountCalculation(
  account: PlannerAccount,
  opportunities: Opportunity[],
  coupons: Coupon[],
  productDetailsById: ReadonlyMap<string, Product>,
) {
  const opportunityById = new Map(opportunities.map((opportunity) => [opportunity.productId, opportunity]));
  const offerUses = new Map<string, number>();
  const products = account.productIds.flatMap((productId, index) => {
    const opportunity = opportunityById.get(productId);
    if (!opportunity) return [];
    const offers = (productDetailsById.get(productId)?.offers ?? [])
      .filter((offer) => offer.price !== null && offer.quantityAvailable > 0)
      .sort((left, right) => Number(left.price) - Number(right.price));
    const offer = offers.find((currentOffer) => {
      return (offerUses.get(currentOffer.id) ?? 0) < getOfferCapacity(currentOffer);
    });
    if (offer) offerUses.set(offer.id, (offerUses.get(offer.id) ?? 0) + 1);
    return [
      {
        id: account.itemIds[index] ?? `${productId}:${index}`,
        opportunity: offer
          ? {
              ...opportunity,
              basePurchasePrice: Number(offer.price),
              currency: offer.currency,
              stock: offer.quantityAvailable,
              offerUrl: offer.url,
            }
          : opportunity,
      },
    ];
  });
  const couponsById = new Map(coupons.map((coupon) => [coupon.id, coupon]));
  const fixedCouponByProductId = new Map<string, Coupon>();
  const usedCouponIds = new Set<string>();
  for (const product of products) {
    const couponId = account.couponByProductId[product.id];
    const coupon = couponId ? couponsById.get(couponId) : undefined;
    if (
      coupon &&
      !usedCouponIds.has(coupon.id) &&
      toCents(coupon.minPurchase) <= toCents(product.opportunity.basePurchasePrice)
    ) {
      fixedCouponByProductId.set(product.id, coupon);
      usedCouponIds.add(coupon.id);
    }
  }
  const items: PlannedItem[] = products.map((product) => {
    const { id, opportunity } = product;
    const coupon =
      fixedCouponByProductId.get(id) ??
      findBestAvailableCoupon(opportunity.basePurchasePrice, coupons, usedCouponIds);
    if (coupon) usedCouponIds.add(coupon.id);
    const effectivePurchasePrice = fromCents(
      toCents(opportunity.basePurchasePrice) - toCents(coupon?.discountAmount ?? 0),
    );
    const estimatedProfit = fromCents(
      toCents(opportunity.estimatedSellingPrice) - toCents(effectivePurchasePrice),
    );
    return {
      id,
      opportunity,
      coupon,
      effectivePurchasePrice,
      estimatedProfit,
      roi: effectivePurchasePrice > 0 ? (estimatedProfit / effectivePurchasePrice) * 100 : null,
    };
  });
  const effectivePurchasePrice = items.reduce((sum, item) => sum + item.effectivePurchasePrice, 0);
  const estimatedProfit = items.reduce((sum, item) => sum + item.estimatedProfit, 0);

  return {
    products,
    items,
    effectivePurchasePrice,
    estimatedProfit,
    roi: effectivePurchasePrice > 0 ? (estimatedProfit / effectivePurchasePrice) * 100 : null,
    usedCouponCount: usedCouponIds.size,
  };
}

function getStoredAccounts(): PlannerAccount[] {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return [];
    return persistedPlannerSchema.parse(JSON.parse(storedValue)).accounts.map((account) => ({
      ...account,
      itemIds:
        account.itemIds.length === account.productIds.length
          ? account.itemIds
          : account.productIds.map(() => createAccountId()),
    }));
  } catch {
    return [];
  }
}

function createAccountId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function AccountPlanner({
  opportunities,
  coupons,
  productDetailsById = new Map(),
}: AccountPlannerProps) {
  const [accounts, setAccounts] = useState<PlannerAccount[]>(getStoredAccounts);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ accounts }));
  }, [accounts]);

  const updateAccount = (accountId: string, update: (account: PlannerAccount) => PlannerAccount) => {
    setAccounts((currentAccounts) =>
      currentAccounts.map((account) => (account.id === accountId ? update(account) : account)),
    );
  };

  const calculations = accounts.map((account) =>
    getAccountCalculation(account, opportunities, coupons, productDetailsById),
  );
  const totalInvestment = calculations.reduce(
    (sum, calculation) => sum + calculation.effectivePurchasePrice,
    0,
  );
  const totalProfit = calculations.reduce((sum, calculation) => sum + calculation.estimatedProfit, 0);
  const totalRoi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : null;

  return (
    <section className="mt-10" aria-labelledby="account-planner-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="account-planner-title" className="text-xl font-semibold text-slate-900">
            Planificador de cuentas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Organiza compras temporales por cuenta. Se guardan sólo en este navegador.
          </p>
        </div>
        <Button
          type="button"
          onClick={() =>
            setAccounts((currentAccounts) => [
              ...currentAccounts,
              {
                id: createAccountId(),
                title: `Cuenta ${currentAccounts.length + 1}`,
                productIds: [],
                itemIds: [],
                couponByProductId: {},
              },
            ])
          }
        >
          <Plus /> Añadir cuenta
        </Button>
      </div>

      {accounts.length > 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-wrap items-start justify-between gap-x-10 gap-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Inversión total</p>
              <p className="text-xl font-semibold" aria-label="Inversión total del planificador">
                {formatEuro(totalInvestment)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-muted-foreground">Beneficio total</p>
              <p className="text-3xl font-semibold tracking-tight" aria-label="Beneficio total del planificador">
                {formatEuro(totalProfit)}
              </p>
              <span className="text-sm text-muted-foreground">
                ROI {totalRoi === null ? '—' : `${roiFormatter.format(totalRoi)}%`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {accounts.map((account, index) => {
          const calculation = calculations[index]!;
          const selectedCountByProductId = new Map<string, number>();
          for (const productId of account.productIds) {
            selectedCountByProductId.set(
              productId,
              (selectedCountByProductId.get(productId) ?? 0) + 1,
            );
          }
          const selectableProducts: ProductOption[] = opportunities
            .filter((opportunity) => {
              const product = productDetailsById.get(opportunity.productId);
              if (!product) return true;
              const totalCapacity = product.offers.reduce((total, offer) => {
                return total + getOfferCapacity(offer);
              }, 0);
              return (selectedCountByProductId.get(opportunity.productId) ?? 0) < totalCapacity;
            })
            .map((opportunity) => ({
              id: opportunity.productId,
              name: opportunity.name,
              shortName: opportunity.shortName,
              imageUrl: opportunity.imageUrl,
            }));

          return (
            <Card key={account.id}>
              <CardHeader className="gap-3">
                <Input
                  aria-label={`Título de la cuenta ${index + 1}`}
                  value={account.title}
                  onChange={(event) =>
                    updateAccount(account.id, (currentAccount) => ({
                      ...currentAccount,
                      title: event.target.value.slice(0, 120),
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${account.title || `cuenta ${index + 1}`}`}
                  onClick={() =>
                    setAccounts((currentAccounts) =>
                      currentAccounts.filter((currentAccount) => currentAccount.id !== account.id),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProductCombobox
                  options={selectableProducts}
                  onProductIdChange={(productId) => {
                    if (!productId) return;
                    updateAccount(account.id, (currentAccount) => ({
                      ...currentAccount,
                      productIds: [...currentAccount.productIds, productId],
                      itemIds: [...currentAccount.itemIds, createAccountId()],
                    }));
                  }}
                  ariaLabel={`Buscar producto para ${account.title || `cuenta ${index + 1}`}`}
                  placeholder="Buscar producto disponible..."
                />

                {calculation.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Busca y añade productos para preparar esta cuenta.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Precio final</TableHead>
                        <TableHead className="text-right">Cupón</TableHead>
                        <TableHead className="text-right">Beneficio</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead><span className="sr-only">Eliminar</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculation.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex min-w-40 items-center gap-2">
                              {item.opportunity.imageUrl ? (
                                <img
                                  src={item.opportunity.imageUrl}
                                  alt=""
                                  className="size-8 shrink-0 rounded-md border object-cover"
                                />
                              ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground">
                                  <ImageOff className="size-4" />
                                </span>
                              )}
                              <span className="truncate">{item.opportunity.shortName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatEuro(item.effectivePurchasePrice)}</TableCell>
                          <TableCell className="text-right">
                            <Popover>
                              <PopoverTrigger
                                render={
                                  <button
                                    type="button"
                                    className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`Cambiar cupón de ${item.opportunity.shortName}`}
                                  />
                                }
                              >
                                {item.coupon ? (
                                  <CouponDiscountBadge
                                    amount={item.coupon.discountAmount}
                                    category={item.coupon.category}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">Sin cupón</span>
                                )}
                              </PopoverTrigger>
                              <PopoverContent className="w-auto">
                                <div
                                  className="flex max-w-64 flex-wrap gap-2"
                                  aria-label={`Seleccionar cupón para ${item.opportunity.shortName}`}
                                >
                                  {coupons
                                    .filter((coupon) => {
                                      return (
                                        toCents(coupon.minPurchase) <=
                                        toCents(item.opportunity.basePurchasePrice)
                                      );
                                    })
                                    .map((coupon) => (
                                      <button
                                        key={coupon.id}
                                        type="button"
                                        className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label={`Aplicar descuento de ${formatEuro(coupon.discountAmount)} a ${item.opportunity.shortName}`}
                                        onClick={() =>
                                          updateAccount(account.id, (currentAccount) => {
                                            const couponByProductId = Object.fromEntries(
                                              Object.entries(currentAccount.couponByProductId).filter(
                                                ([, couponId]) => couponId !== coupon.id,
                                              ),
                                            );
                                            return {
                                              ...currentAccount,
                                              couponByProductId: {
                                                ...couponByProductId,
                                              [item.id]: coupon.id,
                                              },
                                            };
                                          })
                                        }
                                      >
                                        <CouponDiscountBadge
                                          amount={coupon.discountAmount}
                                          category={coupon.category}
                                        />
                                      </button>
                                    ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    onClick={() =>
                                      updateAccount(account.id, (currentAccount) => {
                                        const couponByProductId = {
                                          ...currentAccount.couponByProductId,
                                        };
                                        delete couponByProductId[item.id];
                                        return { ...currentAccount, couponByProductId };
                                      })
                                    }
                                  >
                                    Automático
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right">{formatEuro(item.estimatedProfit)}</TableCell>
                          <TableCell className="text-right">
                            {item.roi === null ? '—' : `${roiFormatter.format(item.roi)}%`}
                          </TableCell>
                          <TableCell className="pr-0 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Eliminar ${item.opportunity.shortName} de ${account.title}`}
                              onClick={() =>
                                updateAccount(account.id, (currentAccount) => ({
                                  ...currentAccount,
                                  productIds: currentAccount.productIds.filter(
                                    (_, itemIndex) => currentAccount.itemIds[itemIndex] !== item.id,
                                  ),
                                  itemIds: currentAccount.itemIds.filter((itemId) => itemId !== item.id),
                                  couponByProductId: Object.fromEntries(
                                    Object.entries(currentAccount.couponByProductId).filter(
                                      ([itemId]) => itemId !== item.id,
                                    ),
                                  ),
                                }))
                              }
                            >
                              <X />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cupones utilizados</p>
                    <p className="mt-1 font-medium">
                      {calculation.usedCouponCount} de {coupons.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Inversión</p>
                    <p className="font-semibold">{formatEuro(calculation.effectivePurchasePrice)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Beneficio {formatEuro(calculation.estimatedProfit)} · ROI{' '}
                      {calculation.roi === null ? '—' : `${roiFormatter.format(calculation.roi)}%`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
