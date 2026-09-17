import type { PublicationProductReassignInput } from '@alitracker/shared';

import { HttpError } from '../../utils/http-error.js';
import { PublicationProductsRepository } from './publication-products.repository.js';

const repository = new PublicationProductsRepository();

export async function reassignPublicationProduct(
  publicationProductId: string,
  input: PublicationProductReassignInput,
  publicationProductsRepository: Pick<
    PublicationProductsRepository,
    'findById' | 'findProduct' | 'updateProduct'
  > = repository,
) {
  const publicationProduct = await publicationProductsRepository.findById(publicationProductId);
  if (!publicationProduct) throw new HttpError('Publication product not found.', 404);

  const product = await publicationProductsRepository.findProduct(input.productId);
  if (!product) throw new HttpError('Product not found.', 404);

  const updated = await publicationProductsRepository.updateProduct(
    publicationProductId,
    input.productId,
  );
  if (!updated) throw new HttpError('Publication product not found.', 404);
  return updated;
}

export async function deletePublicationProduct(
  publicationProductId: string,
  publicationProductsRepository: Pick<PublicationProductsRepository, 'delete'> = repository,
) {
  const deleted = await publicationProductsRepository.delete(publicationProductId);
  if (!deleted) throw new HttpError('Publication product not found.', 404);
}
