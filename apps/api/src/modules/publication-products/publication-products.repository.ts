import { eq } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';
import { publicationProducts } from '../../db/schema/aliexpress-publications.js';
import { products } from '../../db/schema/products.js';

export class PublicationProductsRepository {
  async findById(id: string) {
    const [publicationProduct] = await getDatabase()
      .select({ id: publicationProducts.id, productId: publicationProducts.productId })
      .from(publicationProducts)
      .where(eq(publicationProducts.id, id));
    return publicationProduct;
  }

  async findProduct(id: string) {
    const [product] = await getDatabase()
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async updateProduct(publicationProductId: string, productId: string) {
    const [publicationProduct] = await getDatabase()
      .update(publicationProducts)
      .set({ productId, updatedAt: new Date() })
      .where(eq(publicationProducts.id, publicationProductId))
      .returning({ id: publicationProducts.id, productId: publicationProducts.productId });
    return publicationProduct;
  }

  async delete(id: string) {
    const [publicationProduct] = await getDatabase()
      .delete(publicationProducts)
      .where(eq(publicationProducts.id, id))
      .returning({ id: publicationProducts.id });
    return publicationProduct;
  }
}
