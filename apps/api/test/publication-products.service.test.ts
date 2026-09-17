import { describe, expect, it, vi } from 'vitest';

import {
  deletePublicationProduct,
  reassignPublicationProduct,
} from '../src/modules/publication-products/publication-products.service';

const publicationProductId = '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de';
const productId = '9f7d2e8f-1781-411a-b74a-7923d9a83ea1';

describe('publication products service', () => {
  it('reassigns an existing publication product to another existing product', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: publicationProductId, productId: 'old-product' }),
      findProduct: vi.fn().mockResolvedValue({ id: productId }),
      updateProduct: vi.fn().mockResolvedValue({ id: publicationProductId, productId }),
    };

    await expect(
      reassignPublicationProduct(publicationProductId, { productId }, repository),
    ).resolves.toEqual({ id: publicationProductId, productId });
    expect(repository.updateProduct).toHaveBeenCalledWith(publicationProductId, productId);
  });

  it('rejects missing publication products and target products', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(undefined),
      findProduct: vi.fn(),
      updateProduct: vi.fn(),
    };
    await expect(
      reassignPublicationProduct(publicationProductId, { productId }, repository),
    ).rejects.toMatchObject({ statusCode: 404 });

    repository.findById.mockResolvedValue({ id: publicationProductId, productId: 'old-product' });
    repository.findProduct.mockResolvedValue(undefined);
    await expect(
      reassignPublicationProduct(publicationProductId, { productId }, repository),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deletes an existing publication product and rejects unknown ids', async () => {
    const repository = { delete: vi.fn().mockResolvedValue({ id: publicationProductId }) };
    await expect(
      deletePublicationProduct(publicationProductId, repository),
    ).resolves.toBeUndefined();

    repository.delete.mockResolvedValue(undefined);
    await expect(deletePublicationProduct(publicationProductId, repository)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
