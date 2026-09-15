import { Router } from 'express';

import { getProduct } from './aliexpress-product-lookup.controller';

export const aliExpressProductLookupRouter = Router();

aliExpressProductLookupRouter.get('/:productId', getProduct);
