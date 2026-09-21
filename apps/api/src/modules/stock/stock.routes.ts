import { Router } from 'express';

import { list } from './stock.controller.js';

export const stockRouter = Router();

stockRouter.get('/', list);
