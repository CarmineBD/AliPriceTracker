import type { AliExpressTrackerResult } from '../modules/aliexpress-tracker/aliexpress-tracker.service';
import type { ProductBestOfferRefreshResult } from '../modules/product-best-offer/product-best-offer.service';

type JobLogger = Pick<Console, 'error'> & Partial<Pick<Console, 'info'>>;

export async function runAliExpressTrackerJob({
  track,
  refreshBestOffers,
  closeDatabase,
  logger = console,
}: {
  track: () => Promise<AliExpressTrackerResult>;
  refreshBestOffers?: (input: {
    refreshedPublicationProductIds: string[];
    capturedAt: Date;
  }) => Promise<ProductBestOfferRefreshResult>;
  closeDatabase: () => Promise<void>;
  logger?: JobLogger;
}): Promise<number> {
  let exitCode = 0;

  try {
    const result = await track();
    if (refreshBestOffers) {
      const bestOffers = await refreshBestOffers({
        refreshedPublicationProductIds: result.refreshedPublicationProductIds ?? [],
        capturedAt: new Date(),
      });
      logger.info?.(JSON.stringify({ event: 'product_best_offer_finished', bestOffers }));
    }
    if (result.aborted) {
      exitCode = 1;
    }
  } catch (error) {
    logger.error(error);
    exitCode = 1;
  }

  try {
    await closeDatabase();
  } catch (error) {
    logger.error(error);
    exitCode = 1;
  }

  return exitCode;
}
