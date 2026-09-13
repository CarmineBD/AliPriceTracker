import cors from 'cors';
import express from 'express';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { apiRouter } from './routes';

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
  }),
);
app.use(express.json());
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
