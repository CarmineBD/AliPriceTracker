import { sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';

import type { PublicationProductChangesListQuery } from '@alitracker/shared';

export type PublicationProductChangeRow = {
  historyId: string;
  publicationProductId: string;
  changeType: 'price' | 'stock';
  previousPrice: string | null;
  currentPrice: string | null;
  previousCurrency: string | null;
  currentCurrency: string | null;
  previousQuantityAvailable: number | null;
  currentQuantityAvailable: number | null;
  // Raw PostgreSQL queries return timestamps as ISO strings instead of mapped Date instances.
  changedAt: Date | string;
  productId: string;
  productName: string;
  productShortName: string;
  productImageKey: string | null;
  productIconUrl: string | null;
  storeName: string | null;
  publicationUrl: string | null;
};

type ChangePage = {
  changes: PublicationProductChangeRow[];
  total: number;
};

/**
 * The tracker persists a first snapshot before it persists changes. Window functions let us
 * compare every snapshot with the preceding one without loading the complete history into Node.
 */
export class PublicationProductChangesRepository {
  async findPage({ page, pageSize }: PublicationProductChangesListQuery): Promise<ChangePage> {
    const offset = (page - 1) * pageSize;
    const database = getDatabase();
    const changesCte = sql`
      WITH snapshots AS (
        SELECT
          history.id AS "historyId",
          history.publication_product_id AS "publicationProductId",
          history.price AS "currentPrice",
          history.currency AS "currentCurrency",
          history.quantity_available AS "currentQuantityAvailable",
          history.captured_at AS "changedAt",
          lag(history.id) OVER history_window AS "previousHistoryId",
          lag(history.price) OVER history_window AS "previousPrice",
          lag(history.currency) OVER history_window AS "previousCurrency",
          lag(history.quantity_available) OVER history_window AS "previousQuantityAvailable"
        FROM publication_product_history AS history
        WINDOW history_window AS (
          PARTITION BY history.publication_product_id
          ORDER BY history.captured_at ASC, history.id ASC
        )
      ),
      changes AS (
        SELECT
          "historyId",
          "publicationProductId",
          "previousHistoryId",
          'price'::text AS "changeType",
          "previousPrice",
          "currentPrice",
          "previousCurrency",
          "currentCurrency",
          "previousQuantityAvailable",
          "currentQuantityAvailable",
          "changedAt"
        FROM snapshots
        WHERE "previousHistoryId" IS NOT NULL
          AND (
            "currentPrice" IS DISTINCT FROM "previousPrice"
            OR "currentCurrency" IS DISTINCT FROM "previousCurrency"
          )

        UNION ALL

        SELECT
          "historyId",
          "publicationProductId",
          "previousHistoryId",
          'stock'::text AS "changeType",
          "previousPrice",
          "currentPrice",
          "previousCurrency",
          "currentCurrency",
          "previousQuantityAvailable",
          "currentQuantityAvailable",
          "changedAt"
        FROM snapshots
        WHERE "previousHistoryId" IS NOT NULL
          AND "currentQuantityAvailable" IS DISTINCT FROM "previousQuantityAvailable"
      )
    `;

    const [result, countResult] = await Promise.all([
      database.execute<PublicationProductChangeRow>(sql`
      ${changesCte}
      SELECT
        changes."historyId",
        changes."publicationProductId",
        changes."changeType",
        changes."previousPrice",
        changes."currentPrice",
        changes."previousCurrency",
        changes."currentCurrency",
        changes."previousQuantityAvailable",
        changes."currentQuantityAvailable",
        changes."changedAt",
        product.id AS "productId",
        product.name AS "productName",
        product.short_name AS "productShortName",
        product.image_key AS "productImageKey",
        product.icon_url AS "productIconUrl",
        store.name AS "storeName",
        publication.url AS "publicationUrl"
      FROM changes
      INNER JOIN publication_products AS publication_product
        ON publication_product.id = changes."publicationProductId"
      INNER JOIN products AS product ON product.id = publication_product.product_id
      INNER JOIN publications AS publication ON publication.id = publication_product.publication_id
      INNER JOIN stores AS store ON store.id = publication.store_id
      ORDER BY changes."changedAt" DESC, changes."historyId" DESC, changes."changeType" ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
      `),
      database.execute<{ total: number }>(sql`
      ${changesCte}
      SELECT count(*)::int AS total
      FROM changes
      `),
    ]);

    return {
      changes: [...result],
      total: countResult[0]?.total ?? 0,
    };
  }
}
