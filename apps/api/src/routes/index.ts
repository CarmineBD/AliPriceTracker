import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes';
import { aliexpressDebugRouter } from '../modules/aliexpress-debug/aliexpress-debug.routes';
import { aliExpressPublicationImportRouter } from '../modules/aliexpress-publication-import/aliexpress-publication-import.routes';
import { aliExpressProductLookupRouter } from '../modules/aliexpress-product-lookup/aliexpress-product-lookup.routes';
import { productsRouter } from '../modules/products/products.routes';
import { storesRouter } from '../modules/stores/stores.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/debug/aliexpress', aliexpressDebugRouter);
apiRouter.use('/aliexpress/products', aliExpressProductLookupRouter);
apiRouter.use('/aliexpress/publications', aliExpressPublicationImportRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/stores', storesRouter);
