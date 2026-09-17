import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes';
import { aliexpressDebugRouter } from '../modules/aliexpress-debug/aliexpress-debug.routes';
import { aliExpressPublicationImportRouter } from '../modules/aliexpress-publication-import/aliexpress-publication-import.routes';
import { aliExpressProductLookupRouter } from '../modules/aliexpress-product-lookup/aliexpress-product-lookup.routes';
import { eventsRouter } from '../modules/events/events.routes';
import { publicationProductHistoryRouter } from '../modules/publication-product-history/publication-product-history.routes';
import { publicationProductsRouter } from '../modules/publication-products/publication-products.routes';
import { productsRouter } from '../modules/products/products.routes';
import { productBestOfferRouter } from '../modules/product-best-offer/product-best-offer.routes';
import { storesRouter } from '../modules/stores/stores.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/debug/aliexpress', aliexpressDebugRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/aliexpress/products', aliExpressProductLookupRouter);
apiRouter.use('/aliexpress/publications', aliExpressPublicationImportRouter);
apiRouter.use('/publication-products', publicationProductHistoryRouter);
apiRouter.use('/publication-products', publicationProductsRouter);
apiRouter.use('/products', productBestOfferRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/stores', storesRouter);
