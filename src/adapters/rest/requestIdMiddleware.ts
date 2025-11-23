/**
 * Request ID middleware for request tracing
 * Generates a unique ID for each request and attaches it to the request object
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

// Extend Express Request type to include requestId
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  return `req-${randomBytes(8).toString('hex')}`;
}

/**
 * Middleware that generates and attaches a request ID to each request
 * Also adds the request ID to the response headers
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request ID is provided in headers (for distributed tracing)
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();

  // Attach to request object
  req.requestId = requestId;

  // Add to response headers
  res.setHeader('X-Request-Id', requestId);

  next();
}
