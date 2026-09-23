import type { StockList, StockStatusLabel } from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service.js';
import { StockRepository } from './stock.repository.js';

const repository = new StockRepository();

type StockRepositoryPort = Pick<StockRepository, 'findAll'>;

function getStatusLabels({
  orderedQuantity,
  toBeSentQuantity,
}: {
  orderedQuantity: number;
  toBeSentQuantity: number;
}): StockStatusLabel[] {
  const statusLabels: StockStatusLabel[] = [];

  if (orderedQuantity > 0) {
    statusLabels.push({
      status: 'ordered',
      label: 'Pedido, pendiente de recibir',
      quantity: orderedQuantity,
    });
  }

  if (toBeSentQuantity > 0) {
    statusLabels.push({
      status: 'to_be_sent',
      label: 'Pendiente de enviar',
      quantity: toBeSentQuantity,
    });
  }

  return statusLabels;
}

export async function listStock(
  repositoryOverride: StockRepositoryPort = repository,
): Promise<StockList> {
  const stock = await repositoryOverride.findAll();

  return {
    stock: stock.flatMap((item) => {
      const statusLabels = getStatusLabels(item);

      if (item.quantity === 0 && statusLabels.length === 0) {
        return [];
      }

      return [
        {
          productId: item.productId,
          imageUrl: item.imageKey ? getPublicUrl(item.imageKey) : null,
          name: item.name,
          shortName: item.shortName,
          quantity: item.quantity,
          statusLabels,
        },
      ];
    }),
  };
}
