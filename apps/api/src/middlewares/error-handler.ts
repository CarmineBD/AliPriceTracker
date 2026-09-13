import type { ErrorRequestHandler, RequestHandler } from 'express';

import { HttpError } from '../utils/http-error';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: 'Not Found',
    message: `Route ${request.method} ${request.originalUrl} was not found.`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: 'Internal Server Error' });
};
