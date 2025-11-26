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
    try {
      // Get Clerk auth from request (cast to any to work with Clerk SDK)
      const auth = getAuth(req as any);

      // If user is authenticated, populate req.user
      if (auth && auth.userId) {
        // Get user from Clerk
        const externalUser = await authService.getUserById(auth.userId);

        if (externalUser) {
          // Find or create player identity
          const playerIdentity = await authService.findOrCreatePlayer(externalUser);

          // Populate req.user with generic AuthenticatedUser
          req.user = {
            id: playerIdentity.id,
            externalId: externalUser.id,
            username: externalUser.username,
            email: externalUser.email,
          };
        }
      }

      next();
    } catch (error) {
      // Log error but don't block request
      // Authentication errors will be caught by requireAuth middleware
      console.error('Error in clerkMiddleware:', error);
      next();
    }
  };
}
