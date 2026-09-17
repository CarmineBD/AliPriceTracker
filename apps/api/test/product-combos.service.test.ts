import { describe, expect, it } from 'vitest';

import type { ProductsRepository } from '../src/modules/products/products.repository';
import type { ProductCombosRepository } from '../src/modules/products/product-combos.repository';
import {
  addProductComponent,
  assertProductPriceCanBeUpdated,
  listProductComponents,
  type ProductComboServiceRepositories,
} from '../src/modules/products/product-combos.service';

const comboId = '8d8c883c-7e36-4af0-a8b3-152b20c41f3c';
const componentId = '9d8c883c-7e36-4af0-a8b3-152b20c41f3c';

type StoredProduct = NonNullable<Awaited<ReturnType<ProductsRepository['findById']>>>;
type StoredComponent = NonNullable<
  Awaited<ReturnType<ProductCombosRepository['findComponent']>>
>;

const product: StoredProduct = {
  id: comboId,
  name: 'DJI Neo 2 Fly More Combo',
  shortName: 'Neo 2 Combo',
  iconUrl: null,
  imageKey: null,
  description: null,
  averageSellingPrice: null,
  effectiveSellingPrice: '280.00',
  createdAt: new Date('2026-09-17T10:00:00.000Z'),
  updatedAt: new Date('2026-09-17T10:00:00.000Z'),
};

const component: StoredComponent = {
  productId: comboId,
  containsProductId: componentId,
  quantity: 2,
  name: 'DJI Neo 2',
  shortName: 'Neo 2',
  imageKey: null,
  averageSellingPrice: '140.00',
};

const unexpected = async (): Promise<never> => {
  throw new Error('This repository method should not be called in this test.');
};

function repositories({
  componentIsCombo = false,
  productIsAlreadyAComponent = false,
}: {
  componentIsCombo?: boolean;
  productIsAlreadyAComponent?: boolean;
} = {}): ProductComboServiceRepositories {
  return {
    products: { findById: async () => product },
    combos: {
      create: unexpected,
      delete: unexpected,
      findComponent: async () => undefined,
      findComponents: async () => [component],
      hasComponents: async () => componentIsCombo,
      isContainedByAnotherProduct: async () => productIsAlreadyAComponent,
      update: unexpected,
    },
  };
}

describe('product combo service', () => {
  it('returns components with their effective price without an extra product lookup', async () => {
    await expect(listProductComponents(comboId, repositories())).resolves.toEqual([
      {
        productId: comboId,
        containsProductId: componentId,
        quantity: 2,
        product: {
          id: componentId,
          name: 'DJI Neo 2',
          shortName: 'Neo 2',
          imageKey: null,
          imageUrl: null,
          averageSellingPrice: 140,
          effectiveSellingPrice: 140,
        },
      },
    ]);
  });

  it('rejects a product containing itself', async () => {
    await expect(
      addProductComponent(comboId, { containsProductId: comboId, quantity: 1 }, repositories()),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects nested combos in both possible creation orders', async () => {
    await expect(
      addProductComponent(
        comboId,
        { containsProductId: componentId, quantity: 1 },
        repositories({ componentIsCombo: true }),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    await expect(
      addProductComponent(
        comboId,
        { containsProductId: componentId, quantity: 1 },
        repositories({ productIsAlreadyAComponent: true }),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does not permit a stored selling price for a combo', async () => {
    await expect(
      assertProductPriceCanBeUpdated(comboId, { combos: repositories({ componentIsCombo: true }).combos }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
