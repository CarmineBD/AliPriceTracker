import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes';
import { aliexpressDebugRouter } from '../modules/aliexpress-debug/aliexpress-debug.routes';
import { productsRouter } from '../modules/products/products.routes';
import { sellerProductsRouter, sellersRouter } from '../modules/sellers/sellers.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/debug/aliexpress', aliexpressDebugRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/sellers', sellersRouter);
apiRouter.use('/seller-products', sellerProductsRouter);
