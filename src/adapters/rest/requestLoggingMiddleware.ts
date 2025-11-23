/**
 * Request logging middleware
 * Logs HTTP requests with request ID, method, path, and response time
 */

import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../../infrastructure/logging/Logger';

/**
 * Middleware that logs HTTP requests
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const logger = getLogger();
  const startTime = Date.now();

  // Log request start
  logger.info('HTTP request started', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('HTTP request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}
