import { StoresRepository } from './stores.repository';

const storesRepository = new StoresRepository();

type StoresRepositoryPort = Pick<StoresRepository, 'findAll'>;

export async function listStores(repository: StoresRepositoryPort = storesRepository) {
  const stores = await repository.findAll();

  return stores.map((store) => ({
    id: store.id,
    aliexpressStoreId: store.aliexpressStoreId.toString(),
    name: store.name,
    location: store.location,
    reviewScore: store.reviewScore === null ? null : Number(store.reviewScore),
    sales180d: store.sales180d,
    publicationsCount: store.publicationsCount,
  }));
}
