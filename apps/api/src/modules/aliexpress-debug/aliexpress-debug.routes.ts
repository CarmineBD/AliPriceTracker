import { Router } from 'express';

import { getProduct } from './aliexpress-debug.controller';

export const aliexpressDebugRouter = Router();

aliexpressDebugRouter.get('/product/:productId', getProduct);
