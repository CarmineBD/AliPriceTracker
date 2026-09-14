import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from '../utils/http-error';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: 'Not Found',
    message: `Route ${request.method} ${request.originalUrl} was not found.`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    response.status(413).json({ error: 'Image file exceeds the 5 MB limit.' });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'Validation Error',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: 'Internal Server Error' });
};
