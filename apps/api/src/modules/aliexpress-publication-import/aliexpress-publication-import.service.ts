import type { AliExpressPublicationImportInput } from '@alitracker/shared';

import { HttpError } from '../../utils/http-error';
import { AliExpressPublicationImportRepository } from './aliexpress-publication-import.repository';

type ImportRepository = Pick<
  AliExpressPublicationImportRepository,
  | 'createPublication'
  | 'createPublicationProducts'
  | 'findExistingProductIds'
  | 'findOrCreateStore'
  | 'findPublicationByAliExpressProductId'
  | 'transaction'
>;

function getDuplicateSkuIds(products: AliExpressPublicationImportInput['products']): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const product of products) {
    if (seen.has(product.aliexpressSkuId)) {
      duplicates.add(product.aliexpressSkuId);
    }
    seen.add(product.aliexpressSkuId);
  }

  return [...duplicates];
}

function isUniqueViolation(error: unknown): error is { code: string; constraint?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function isPublicationUniqueViolation(error: { constraint?: string }): boolean {
  return error.constraint?.startsWith('publications_aliexpress_product_id') ?? false;
}

function isSkuUniqueViolation(error: { constraint?: string }): boolean {
  return error.constraint?.startsWith('publication_products_aliexpress_sku_id') ?? false;
}

export async function importAliExpressPublication(
  input: AliExpressPublicationImportInput,
  repository: ImportRepository = new AliExpressPublicationImportRepository(),
) {
  const duplicateSkuIds = getDuplicateSkuIds(input.products);
  if (duplicateSkuIds.length > 0) {
    throw new HttpError(
      'La petición contiene SKUs de AliExpress duplicados.',
      422,
      'DUPLICATE_SKUS',
      { duplicateSkuIds },
    );
  }

  try {
    return await repository.transaction(async (transaction) => {
      const existingPublication = await transaction.findPublicationByAliExpressProductId(
        input.publication.aliexpressProductId,
      );
      if (existingPublication) {
        throw new HttpError(
          `La publicación de AliExpress ${input.publication.aliexpressProductId} ya está registrada en el sistema.`,
          409,
          'PUBLICATION_ALREADY_EXISTS',
          { aliexpressProductId: input.publication.aliexpressProductId },
        );
      }

      const requestedProductIds = [...new Set(input.products.map((product) => product.productId))];
      const existingProductIds = new Set(
        (await transaction.findExistingProductIds(requestedProductIds)).map((product) => product.id),
      );
      const missingProductIds = requestedProductIds.filter((id) => !existingProductIds.has(id));
      if (missingProductIds.length > 0) {
        throw new HttpError(
          'Uno o más productos no existen en el sistema.',
          422,
          'PRODUCTS_NOT_FOUND',
          { missingProductIds },
        );
      }

      const { store, created } = await transaction.findOrCreateStore(input.store);
      const publication = await transaction.createPublication(store.id, input.publication);
      const publicationProducts = await transaction.createPublicationProducts(
        publication.id,
        input.products,
      );

      if (publicationProducts.length !== input.products.length) {
        throw new Error('Publication product creation did not return every SKU.');
      }

      return {
        success: true,
        message: 'Publicación importada correctamente.',
        store: {
          id: store.id,
          aliexpressStoreId: store.aliexpressStoreId.toString(),
          created,
        },
        publication: {
          id: publication.id,
          aliexpressProductId: publication.aliexpressProductId.toString(),
        },
        publicationProducts: publicationProducts.map((publicationProduct) => ({
          id: publicationProduct.id,
          aliexpressSkuId: publicationProduct.aliexpressSkuId,
          productId: publicationProduct.productId,
        })),
      };
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (isUniqueViolation(error) && isPublicationUniqueViolation(error)) {
      throw new HttpError(
        `La publicación de AliExpress ${input.publication.aliexpressProductId} ya está registrada en el sistema.`,
        409,
        'PUBLICATION_ALREADY_EXISTS',
        { aliexpressProductId: input.publication.aliexpressProductId },
      );
    }

    if (isUniqueViolation(error) && isSkuUniqueViolation(error)) {
      throw new HttpError(
        'Uno o más SKUs de AliExpress ya están registrados en el sistema.',
        409,
        'ALIEXPRESS_SKU_ALREADY_EXISTS',
      );
    }

    throw error;
  }
}
