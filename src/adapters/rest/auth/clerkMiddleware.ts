/**
 * Clerk middleware wrapper
 * Wraps Clerk's clerkMiddleware() function and maps to generic AuthenticatedUser type
 *
 * Responsibilities:
 * - Extract user from Clerk session
 * - Map to generic AuthenticatedUser type
 * - Populate req.user with generic type
 *
 * Requirements: 1.1, 1.2, 4.2, 4.3
 */

import { Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { AuthenticatedRequest } from './types';
import { ClerkAuthenticationService } from './clerk/ClerkAuthenticationService';
import { PlayerIdentityRepository } from '../../../domain/interfaces/PlayerIdentityRepository';
import { getLogger } from '../../../infrastructure/logging/Logger';

/**
 * Clerk middleware wrapper that handles authentication
 * Validates Clerk session and populates req.user
 *
 * @param playerIdentityRepository - Repository for player identity persistence
 * @returns Express middleware function
 */
export function clerkMiddleware(playerIdentityRepository: PlayerIdentityRepository) {
  // Create authentication service for user lookup
  const authService = new ClerkAuthenticationService(playerIdentityRepository);

  // Return middleware that wraps Clerk SDK
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const logger = getLogger();
    try {
      // Skip if user is already authenticated (e.g., by sentinel middleware)
      if (req.user) {
        logger.info('clerkMiddleware: User already authenticated, skipping', {
          userId: req.user.id,
        });
        next();
        return;
      }

      // Check for test user header (for non-sentinel testing only)
      const testUserId = req.headers['x-test-user-id'] as string;
      if (testUserId) {
        // Only handle non-sentinel test users here
        // Sentinel users (test-*, blackbox-*) are handled by sentinelUserMiddleware
        const isSentinelUser = testUserId.startsWith('test-') || testUserId.startsWith('blackbox-');

        if (!isSentinelUser) {
          req.user = {
            id: testUserId,
            externalId: testUserId,
            username: `test-user-${testUserId}`,
            email: `test-${testUserId}@example.com`,
          };
          next();
          return;
        }
      }

      // Get Clerk auth from request (cast to any to work with Clerk SDK)
      const auth = getAuth(req as any);
      logger.info('clerkMiddleware: checking auth', { hasAuth: !!auth, userId: auth?.userId });

      // If user is authenticated, populate req.user
      if (auth && auth.userId) {
        logger.info('clerkMiddleware: User authenticated', { userId: auth.userId });
        // Get user from Clerk
        const externalUser = await authService.getUserById(auth.userId);
        logger.info('clerkMiddleware: Got external user', { externalUserId: externalUser?.id });

        if (externalUser) {
          // Find or create player identity
          const playerIdentity = await authService.findOrCreatePlayer(externalUser);
          logger.info('clerkMiddleware: Got player identity', {
            playerIdentityId: playerIdentity.id,
          });

          // Populate req.user with generic AuthenticatedUser
          req.user = {
            id: playerIdentity.id,
            externalId: externalUser.id,
            username: externalUser.username,
            email: externalUser.email,
          };
          logger.info('clerkMiddleware: Set req.user', { userId: req.user.id });
        }
      } else {
        logger.info('clerkMiddleware: No authenticated user');
      }

      next();
    } catch (error) {
      // Log error but don't block request
      // Authentication errors will be caught by requireAuth middleware
      logger.error('Error in clerkMiddleware', {
        error: error instanceof Error ? error.message : String(error),
      });
      next();
    }
  };
}
