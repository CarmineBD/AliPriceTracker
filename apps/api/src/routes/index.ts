import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes';
import { productsRouter } from '../modules/products/products.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/products', productsRouter);
