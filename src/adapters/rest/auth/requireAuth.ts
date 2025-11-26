/**
 * requireAuth middleware
 * Ensures that a request has an authenticated user
 *
 * Responsibilities:
 * - Check for req.user presence
 * - Return 401 if not authenticated
 * - Use generic AuthenticatedUser type
 *
 * Requirements: 1.2, 5.2, 5.3, 8.1
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './types';

/**
 * Middleware that requires authentication
 * Returns 401 if user is not authenticated
 *
 * @param req - Express request with optional user
 * @param res - Express response
 * @param next - Express next function
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Check if user is authenticated
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // User is authenticated, proceed
  next();
}
