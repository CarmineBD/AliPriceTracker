import { Router } from 'express';

import { getProduct, reseedSession } from './aliexpress-debug.controller';

export const aliexpressDebugRouter = Router();

aliexpressDebugRouter.get('/product/:productId', getProduct);
aliexpressDebugRouter.post('/session/reseed', reseedSession);
