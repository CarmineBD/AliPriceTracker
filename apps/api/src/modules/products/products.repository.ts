import { asc, count, eq, getTableColumns, gt, sql } from 'drizzle-orm';

import type { ProductCreateInput, ProductsListQuery, ProductUpdateInput } from '@alitracker/shared';

import { getDatabase } from '../../db/client';
import { publicationProducts, publications, stores } from '../../db/schema/aliexpress-publications';
import { productCombos } from '../../db/schema/product-combos';
import { products } from '../../db/schema/products';

const containedProducts = sql.identifier('contained_products');
const containedProductId = sql.raw('"contained_products"."id"');
const containedProductAverageSellingPrice = sql.raw('"contained_products"."average_selling_price"');
const comboPrice = sql.identifier('combo_price');
const comboComponentCount = sql.raw('"combo_price"."component_count"');
const comboPricedComponentCount = sql.raw('"combo_price"."priced_component_count"');
const comboTotal = sql.raw('"combo_price"."total"');

const effectiveSellingPrice = sql<string | null>`(
  SELECT CASE
    WHEN ${comboComponentCount} = 0 THEN ${products.averageSellingPrice}
    WHEN ${comboPricedComponentCount} = ${comboComponentCount} THEN ${comboTotal}
    ELSE NULL
  END
  FROM (
    SELECT
      count(${productCombos.productId}) AS "component_count",
      count(${containedProductAverageSellingPrice}) AS "priced_component_count",
      sum(${containedProductAverageSellingPrice} * ${productCombos.quantity}) AS "total"
    FROM ${productCombos}
    INNER JOIN ${products} AS ${containedProducts}
      ON ${containedProductId} = ${productCombos.containsProductId}
    WHERE ${productCombos.productId} = ${products.id}
  ) AS ${comboPrice}
)`.as('effective_selling_price');

const lowestAvailablePriceEuro = sql<string | null>`(
  SELECT min(${publicationProducts.price})
  FROM ${publicationProducts}
  WHERE ${eq(publicationProducts.productId, products.id)}
    AND ${eq(publicationProducts.currency, 'EUR')}
    AND ${gt(publicationProducts.quantityAvailable, 0)}
)`.as('lowest_available_price_euro');

export class ProductsRepository {
  async findOptions() {
    return getDatabase()
      .select({
        id: products.id,
        name: products.name,
        shortName: products.shortName,
        imageKey: products.imageKey,
      })
      .from(products)
      .orderBy(asc(products.name), asc(products.createdAt));
  }

  async findPage({ page, pageSize }: ProductsListQuery) {
    const offset = (page - 1) * pageSize;
    const database = getDatabase();
    const offersCount = sql<number>`count(${publicationProducts.id})::int`.as('offers_count');
    const [items, countResult] = await Promise.all([
      database
        .select({
          ...getTableColumns(products),
          offersCount,
          effectiveSellingPrice,
          lowestAvailablePriceEuro,
        })
        .from(products)
        .leftJoin(publicationProducts, eq(publicationProducts.productId, products.id))
        .groupBy(products.id, products.averageSellingPrice)
        .orderBy(asc(products.name), asc(products.createdAt))
        .limit(pageSize)
        .offset(offset),
      database.select({ total: count() }).from(products),
    ]);

    return { items, total: countResult[0]?.total ?? 0 };
  }

  async findById(id: string) {
    const [product] = await getDatabase()
      .select({ ...getTableColumns(products), effectiveSellingPrice, lowestAvailablePriceEuro })
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async findByIdWithOffers(id: string) {
    const product = await this.findById(id);

    if (!product) {
      return undefined;
    }

    const offers = await getDatabase()
      .select({
        id: publicationProducts.id,
        sellerName: stores.name,
        sellerLocation: stores.location,
        sellerReviewScore: stores.reviewScore,
        sellerSalesCount: sql<number | null>`null`,
        price: publicationProducts.price,
        currency: publicationProducts.currency,
        quantityAvailable: publicationProducts.quantityAvailable,
        maxPurchase: publicationProducts.maxPurchase,
        url: publications.url,
      })
      .from(publicationProducts)
      .innerJoin(publications, eq(publicationProducts.publicationId, publications.id))
      .innerJoin(stores, eq(publications.storeId, stores.id))
      .where(eq(publicationProducts.productId, id))
      .orderBy(asc(stores.name), asc(publicationProducts.createdAt));

    return { product, offers };
  }

  async create(input: ProductCreateInput) {
    const [product] = await getDatabase()
      .insert(products)
      .values({
        ...input,
        averageSellingPrice:
          input.averageSellingPrice == null
            ? input.averageSellingPrice
            : input.averageSellingPrice.toFixed(2),
      })
      .returning();
    return product ? this.findById(product.id) : undefined;
  }

  async update(id: string, input: ProductUpdateInput) {
    const [product] = await getDatabase()
      .update(products)
      .set({
        ...input,
        averageSellingPrice:
          input.averageSellingPrice === undefined
            ? undefined
            : input.averageSellingPrice === null
              ? null
              : input.averageSellingPrice.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return product ? this.findById(product.id) : undefined;
  }

  async updateImageKey(id: string, imageKey: string) {
    const [product] = await getDatabase()
      .update(products)
      .set({ imageKey, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product ? this.findById(product.id) : undefined;
  }

  async delete(id: string) {
    const [product] = await getDatabase().delete(products).where(eq(products.id, id)).returning();
    return product;
  }
}
