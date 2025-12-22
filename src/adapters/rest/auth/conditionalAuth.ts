/**
 * Conditional authentication middleware factory
 * Returns either requireAuth middleware or a no-op based on configuration
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './types';
import { requireAuth } from './requireAuth';

/**
 * Creates a conditional authentication middleware
 * @param enabled - Whether authentication should be enabled
 * @returns Authentication middleware or no-op
 */
export function createConditionalAuth(enabled: boolean) {
  if (enabled) {
    return requireAuth;
  }

  // Return no-op middleware that just calls next()
  return (_req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    next();
  };
}
