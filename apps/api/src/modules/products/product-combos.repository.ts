import { and, asc, eq } from 'drizzle-orm';

import type { ProductComboCreateInput, ProductComboUpdateInput } from '@alitracker/shared';

import { getDatabase } from '../../db/client';
import { productCombos } from '../../db/schema/product-combos';
import { products } from '../../db/schema/products';

export class ProductCombosRepository {
  async findComponents(productId: string) {
    return getDatabase()
      .select({
        productId: productCombos.productId,
        containsProductId: productCombos.containsProductId,
        quantity: productCombos.quantity,
        name: products.name,
        shortName: products.shortName,
        imageKey: products.imageKey,
        averageSellingPrice: products.averageSellingPrice,
      })
      .from(productCombos)
      .innerJoin(products, eq(products.id, productCombos.containsProductId))
      .where(eq(productCombos.productId, productId))
      .orderBy(asc(products.name), asc(products.createdAt));
  }

  async findComponent(productId: string, containsProductId: string) {
    const [component] = await getDatabase()
      .select({
        productId: productCombos.productId,
        containsProductId: productCombos.containsProductId,
        quantity: productCombos.quantity,
        name: products.name,
        shortName: products.shortName,
        imageKey: products.imageKey,
        averageSellingPrice: products.averageSellingPrice,
      })
      .from(productCombos)
      .innerJoin(products, eq(products.id, productCombos.containsProductId))
      .where(
        and(
          eq(productCombos.productId, productId),
          eq(productCombos.containsProductId, containsProductId),
        ),
      );
    return component;
  }

  async hasComponents(productId: string) {
    const [component] = await getDatabase()
      .select({ productId: productCombos.productId })
      .from(productCombos)
      .where(eq(productCombos.productId, productId))
      .limit(1);
    return Boolean(component);
  }

  async isContainedByAnotherProduct(productId: string) {
    const [component] = await getDatabase()
      .select({ productId: productCombos.productId })
      .from(productCombos)
      .where(eq(productCombos.containsProductId, productId))
      .limit(1);
    return Boolean(component);
  }

  async create(productId: string, input: ProductComboCreateInput) {
    return getDatabase().transaction(async (transaction) => {
      const [component] = await transaction
        .insert(productCombos)
        .values({ productId, ...input })
        .returning();

      await transaction
        .update(products)
        .set({ averageSellingPrice: null, updatedAt: new Date() })
        .where(eq(products.id, productId));

      return component;
    });
  }

  async update(productId: string, containsProductId: string, input: ProductComboUpdateInput) {
    const [component] = await getDatabase()
      .update(productCombos)
      .set(input)
      .where(
        and(
          eq(productCombos.productId, productId),
          eq(productCombos.containsProductId, containsProductId),
        ),
      )
      .returning();
    return component;
  }

  async delete(productId: string, containsProductId: string) {
    const [component] = await getDatabase()
      .delete(productCombos)
      .where(
        and(
          eq(productCombos.productId, productId),
          eq(productCombos.containsProductId, containsProductId),
        ),
      )
      .returning();
    return component;
  }
}
