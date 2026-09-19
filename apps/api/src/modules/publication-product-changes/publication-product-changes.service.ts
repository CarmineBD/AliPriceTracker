import type {
  PublicationProductChange,
  PublicationProductChangesList,
  PublicationProductChangesListQuery,
} from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service.js';
import {
  PublicationProductChangesRepository,
  type PublicationProductChangeRow,
} from './publication-product-changes.repository.js';

const repository = new PublicationProductChangesRepository();

type ChangesRepository = Pick<PublicationProductChangesRepository, 'findPage'>;

function toIsoTimestamp(timestamp: Date | string): string {
  return timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
}

function toChange(row: PublicationProductChangeRow): PublicationProductChange {
  const base = {
    historyId: row.historyId,
    publicationProductId: row.publicationProductId,
    product: {
      id: row.productId,
      name: row.productName,
      shortName: row.productShortName,
      imageUrl: row.productImageKey ? getPublicUrl(row.productImageKey) : row.productIconUrl,
    },
    storeName: row.storeName,
    publicationUrl: row.publicationUrl,
    changedAt: toIsoTimestamp(row.changedAt),
  };

  if (row.changeType === 'price') {
    return {
      ...base,
      changeType: 'price',
      previousValue: row.previousPrice,
      currentValue: row.currentPrice,
      previousCurrency: row.previousCurrency,
      currentCurrency: row.currentCurrency,
    };
  }

  return {
    ...base,
    changeType: 'stock',
    previousValue: row.previousQuantityAvailable,
    currentValue: row.currentQuantityAvailable,
  };
}

export async function listPublicationProductChanges(
  query: PublicationProductChangesListQuery,
  changesRepository: ChangesRepository = repository,
): Promise<PublicationProductChangesList> {
  const { changes, total } = await changesRepository.findPage(query);

  return {
    changes: changes.map(toChange),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}
