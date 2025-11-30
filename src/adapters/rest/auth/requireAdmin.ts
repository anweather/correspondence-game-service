/**
 * requireAdmin middleware
 * Ensures that a request is from an authenticated admin user
 *
 * Responsibilities:
 * - Check for req.user presence (authentication)
 * - Check if user ID is in admin allow-list (authorization)
 * - Return 401 if not authenticated
 * - Return 403 if authenticated but not an admin
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './types';
import { loadConfig } from '../../../config';

/**
 * Middleware that requires admin authorization
 * Returns 401 if user is not authenticated
 * Returns 403 if user is authenticated but not an admin
 *
 * @param req - Express request with optional user
 * @param res - Express response
 * @param next - Express next function
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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

  // Load admin user IDs from configuration
  const config = loadConfig();
  const adminUserIds = config.adminUserIds;

  // Check if user ID is in admin list
  if (!adminUserIds.includes(req.user.id)) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden: Admin access required',
      },
    });
    return;
  }

  // User is authenticated and authorized as admin, proceed
  next();
}
