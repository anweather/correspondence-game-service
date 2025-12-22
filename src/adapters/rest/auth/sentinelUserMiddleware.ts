/**
 * Sentinel User Middleware
 *
 * Provides authentication bypass for testing by recognizing sentinel user patterns.
 * Sentinel users (test-* or blackbox-* prefixes) bypass normal authentication
 * and get mock user objects populated in req.user.
 *
 * Security: Only works in non-production environments.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './types';
import { AuthenticatedUser } from '../../../domain/interfaces/authentication';
import { getLogger } from '../../../infrastructure/logging/Logger';

/**
 * Checks if the current environment allows sentinel users
 * Sentinel users are blocked in production for security
 */
function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if a user ID follows the sentinel user pattern
 * Sentinel patterns: test-*, blackbox-*
 * Must have content after the prefix (not just the prefix alone)
 */
function isSentinelUser(userId: string): boolean {
  if (!userId || userId.length === 0) {
    return false;
  }

  // Check for sentinel prefixes with content after them
  const sentinelPrefixes = ['test-', 'blackbox-'];
  return sentinelPrefixes.some(
    (prefix) => userId.startsWith(prefix) && userId.length > prefix.length
  );
}

/**
 * Creates a mock authenticated user for sentinel testing
 */
function createSentinelUser(userId: string): AuthenticatedUser {
  return {
    id: userId,
    externalId: userId,
    username: userId,
    email: `${userId}@sentinel.test`,
  };
}

/**
 * Middleware that detects sentinel users and bypasses authentication
 *
 * This middleware runs before clerkMiddleware and checks for sentinel user patterns
 * in the x-test-user-id header. If found (and not in production), it creates a mock
 * authenticated user and populates req.user, effectively bypassing normal auth.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function sentinelUserMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const logger = getLogger();

  try {
    // Extract user ID from test header
    const testUserIdHeader = req.headers['x-test-user-id'];

    // Handle header as string or array (Express can provide either)
    const userId = Array.isArray(testUserIdHeader) ? testUserIdHeader[0] : testUserIdHeader;

    // Skip if no test user ID provided
    if (!userId) {
      return next();
    }

    // Check if this is a sentinel user pattern
    if (!isSentinelUser(userId)) {
      return next();
    }

    // Block sentinel users in production environment
    if (isProductionEnvironment()) {
      logger.warn('Sentinel user blocked in production environment', { userId });
      return next();
    }

    // Create mock authenticated user for sentinel testing
    req.user = createSentinelUser(userId);

    logger.info('Sentinel user authenticated for testing', {
      userId,
      environment: process.env.NODE_ENV || 'undefined',
    });

    next();
  } catch (error) {
    // Log error but don't block request - let normal auth flow handle it
    logger.error('Error in sentinelUserMiddleware', {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
}
