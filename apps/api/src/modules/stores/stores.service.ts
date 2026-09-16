import type { StoreDetail } from '@alitracker/shared';

import { HttpError } from '../../utils/http-error';
import { StoresRepository } from './stores.repository';

const storesRepository = new StoresRepository();

type StoresRepositoryPort = Pick<StoresRepository, 'findAll'>;
type StoreDetailsRepositoryPort = Pick<StoresRepository, 'findByIdWithPublications'>;
type StoreRecord = Pick<
  Awaited<ReturnType<StoresRepository['findAll']>>[number],
  'id' | 'aliexpressStoreId' | 'name' | 'location' | 'reviewScore' | 'sales180d'
>;

function toStoreResponse(store: StoreRecord, publicationsCount: number) {
  return {
    id: store.id,
    aliexpressStoreId: store.aliexpressStoreId.toString(),
    name: store.name,
    location: store.location,
    reviewScore: store.reviewScore === null ? null : Number(store.reviewScore),
    sales180d: store.sales180d,
    publicationsCount,
  };
}

export async function listStores(repository: StoresRepositoryPort = storesRepository) {
  const stores = await repository.findAll();

  return stores.map((store) => toStoreResponse(store, store.publicationsCount));
}

export async function getStore(
  id: string,
  repository: StoreDetailsRepositoryPort = storesRepository,
): Promise<StoreDetail> {
  const result = await repository.findByIdWithPublications(id);

  if (!result) {
    throw new HttpError('Store not found.', 404);
  }

  const publications = new Map<string, StoreDetail['publications'][number]>();

  for (const row of result.publicationRows) {
    let publication = publications.get(row.publicationId);

    if (!publication) {
      publication = {
        id: row.publicationId,
        aliexpressProductId: row.publicationAliexpressProductId.toString(),
        name: row.publicationName,
        url: row.publicationUrl,
        salesCount: row.publicationSalesCount,
        reviewScore:
          row.publicationReviewScore === null ? null : Number(row.publicationReviewScore),
        reviewCount: row.publicationReviewCount,
        products: [],
      };
      publications.set(row.publicationId, publication);
    }

    if (
      row.publicationProductId !== null &&
      row.productId !== null &&
      row.productName !== null &&
      row.productShortName !== null &&
      row.aliexpressSkuId !== null
    ) {
      publication.products.push({
        id: row.publicationProductId,
        productId: row.productId,
        productName: row.productName,
        productShortName: row.productShortName,
        aliexpressSkuId: row.aliexpressSkuId,
        price: row.price,
        currency: row.currency,
        quantityAvailable: row.quantityAvailable,
        maxPurchase: row.maxPurchase,
      });
    }
  }

  const publicationList = [...publications.values()];
  return {
    ...toStoreResponse(result.store, publicationList.length),
    publications: publicationList,
  };
}
