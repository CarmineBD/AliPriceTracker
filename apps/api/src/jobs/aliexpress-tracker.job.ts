import { closeDatabase } from '../db/client.js';
import { trackAllAliExpressPublications } from '../modules/aliexpress-tracker/aliexpress-tracker.service.js';
import { refreshProductBestOffers } from '../modules/product-best-offer/product-best-offer.service.js';
import { runAliExpressTrackerJob } from './aliexpress-tracker.runner.js';

process.exitCode = await runAliExpressTrackerJob({
  track: trackAllAliExpressPublications,
  refreshBestOffers: refreshProductBestOffers,
  closeDatabase,
});
