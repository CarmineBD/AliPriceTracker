import type {
  PurchaseCreateInput,
  PurchaseUpdateInput,
  TransactionsListQuery,
} from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service.js';
import { HttpError } from '../../utils/http-error.js';
import { PurchasesRepository } from './purchases.repository.js';

const repository = new PurchasesRepository();

type PurchaseDependenciesRepository = Pick<PurchasesRepository, 'findProduct' | 'findOffer'>;

export async function listPurchases(
  query: TransactionsListQuery,
  purchasesRepository: Pick<PurchasesRepository, 'findPage'> = repository,
) {
  const { items, total } = await purchasesRepository.findPage(query);
  return {
    purchases: items.map((purchase) => ({
      id: purchase.id,
      productId: purchase.productId,
      offerId: purchase.offerId,
      imageUrl: purchase.imageKey ? getPublicUrl(purchase.imageKey) : null,
      shortName: purchase.shortName,
      publicationUrl: purchase.publicationUrl,
      totalFinalPrice: Number(purchase.totalFinalPrice),
      status: purchase.status,
      date: purchase.date.toISOString(),
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

function toPurchaseResponse(purchase: {
  id: string;
  productId: string;
  offerId: string;
  totalFinalPrice: string;
  status: string;
  date: Date;
}) {
  return {
    ...purchase,
    totalFinalPrice: Number(purchase.totalFinalPrice),
    date: purchase.date.toISOString(),
  };
}

async function assertPurchaseDependencies(
  productId: string,
  offerId: string,
  purchasesRepository: PurchaseDependenciesRepository,
) {
  const [product, offer] = await Promise.all([
    purchasesRepository.findProduct(productId),
    purchasesRepository.findOffer(offerId),
  ]);

  if (!product) throw new HttpError('Product not found.', 404);
  if (!offer) throw new HttpError('Publication product not found.', 404);
  if (offer.productId !== productId) {
    throw new HttpError('The offer does not belong to the selected product.', 400);
  }
}

export async function createPurchase(
  input: PurchaseCreateInput,
  purchasesRepository: Pick<PurchasesRepository, 'create'> &
    PurchaseDependenciesRepository = repository,
) {
  await assertPurchaseDependencies(input.productId, input.offerId, purchasesRepository);
  const purchase = await purchasesRepository.create(input);
  if (!purchase) throw new Error('Purchase creation did not return a purchase.');
  return toPurchaseResponse(purchase);
}

export async function updatePurchase(
  id: string,
  input: PurchaseUpdateInput,
  purchasesRepository: Pick<PurchasesRepository, 'findById' | 'update'> &
    PurchaseDependenciesRepository = repository,
) {
  const existingPurchase = await purchasesRepository.findById(id);
  if (!existingPurchase) throw new HttpError('Purchase not found.', 404);

  await assertPurchaseDependencies(
    input.productId ?? existingPurchase.productId,
    input.offerId ?? existingPurchase.offerId,
    purchasesRepository,
  );

  const purchase = await purchasesRepository.update(id, input);
  if (!purchase) throw new HttpError('Purchase not found.', 404);
  return toPurchaseResponse(purchase);
}

export async function deletePurchase(
  id: string,
  purchasesRepository: Pick<PurchasesRepository, 'delete'> = repository,
) {
  if (!(await purchasesRepository.delete(id))) throw new HttpError('Purchase not found.', 404);
}
