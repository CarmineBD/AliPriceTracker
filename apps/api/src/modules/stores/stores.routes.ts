import { Router } from 'express';

import { list } from './stores.controller';

export const storesRouter = Router();

storesRouter.get('/', list);
