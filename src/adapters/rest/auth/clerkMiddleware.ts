/**
 * Clerk middleware wrapper
 * Wraps Clerk's clerkMiddleware() function and maps to generic AuthenticatedUser type
 *
 * Responsibilities:
 * - Extract user from Clerk session
 * - Map to generic AuthenticatedUser type
 * - Populate req.user with generic type
 * - Handle AUTH_ENABLED=false bypass
 *
 * Requirements: 1.1, 1.2, 4.2, 4.3
 */

import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { loadConfig } from '../../../config';
import { AuthenticatedRequest } from './types';
import { ClerkAuthenticationService } from './clerk/ClerkAuthenticationService';
import { InMemoryPlayerIdentityRepository } from '../../../infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { getLogger } from '../../../infrastructure/logging/Logger';

/**
 * Clerk middleware wrapper that handles authentication
 * When AUTH_ENABLED is false, this middleware is a no-op
 * When AUTH_ENABLED is true, it validates Clerk session and populates req.user
 *
 * @returns Express middleware function
 */
export function clerkMiddleware() {
  const config = loadConfig();

  // If auth is disabled, return a no-op middleware
  if (!config.auth.enabled) {
    return (_req: Request, _res: Response, next: NextFunction): void => {
      next();
    };
  }

  // Create authentication service for user lookup
  const playerIdentityRepository = new InMemoryPlayerIdentityRepository();
  const authService = new ClerkAuthenticationService(playerIdentityRepository);

  // Return middleware that wraps Clerk SDK
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const logger = getLogger();
    try {
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
