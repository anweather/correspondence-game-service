/**
 * Player Profile Routes
 * REST API endpoints for managing player profiles
 *
 * Endpoints:
 * - POST /api/players/profile - Create player profile
 * - GET /api/players/profile - Get current user's profile
 * - PUT /api/players/profile - Update player profile
 * - GET /api/players/:userId/profile - Get player profile by ID (public)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { Router, Response, NextFunction } from 'express';
import { PlayerProfileService } from '@application/services/PlayerProfileService';
import { requireAuth } from './auth/requireAuth';
import { AuthenticatedRequest } from './auth/types';
import { loadConfig } from '../../config';

/**
 * Creates player profile routes
 * @param playerProfileService - Service for managing player profiles
 * @returns Express router with player profile routes
 */
export function createPlayerProfileRoutes(playerProfileService: PlayerProfileService): Router {
  const router = Router();
  const config = loadConfig();

  /**
   * Conditional auth middleware - only require auth when AUTH_ENABLED=true
   * When AUTH_ENABLED=false, Clerk middleware still processes JWT tokens but doesn't require them
   */
  const conditionalAuth = config.auth.enabled
    ? requireAuth
    : (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        // When auth is disabled, create a mock user if Clerk middleware didn't set one
        if (!req.user) {
          req.user = {
            id: 'test-user',
            externalId: 'test-user',
            username: 'TestUser',
            email: 'test@example.com',
          };
        }
        next();
      };

  /**
   * POST /api/players/profile
   * Create a new player profile
   * Requires authentication
   */
  router.post(
    '/players/profile',
    conditionalAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Use externalId (Clerk user ID) for profile, not PlayerIdentity ID
        const userId = req.user!.externalId || req.user!.id;
        const { displayName } = req.body;

        // Check if profile already exists
        const existingProfile = await playerProfileService.getProfile(userId);
        if (existingProfile) {
          res.status(409).json({
            error: {
              code: 'PROFILE_ALREADY_EXISTS',
              message: 'Profile already exists for this user',
            },
          });
          return;
        }

        // Create profile
        try {
          const profile = await playerProfileService.createProfile(userId, displayName);
          res.status(201).json(profile);
        } catch (error) {
          // Handle validation errors
          if (error instanceof Error) {
            if (error.message.includes('already taken')) {
              res.status(409).json({
                error: {
                  code: 'DISPLAY_NAME_TAKEN',
                  message: error.message,
                },
              });
              return;
            }
            // Other validation errors
            res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: error.message,
              },
            });
            return;
          }
          throw error;
        }
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/players/profile
   * Get current user's profile
   * Requires authentication
   */
  router.get(
    '/players/profile',
    conditionalAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Use externalId (Clerk user ID) for profile, not PlayerIdentity ID
        const userId = req.user!.externalId || req.user!.id;

        const profile = await playerProfileService.getProfile(userId);
        if (!profile) {
          res.status(404).json({
            error: {
              code: 'PROFILE_NOT_FOUND',
              message: 'Profile not found for this user',
            },
          });
          return;
        }

        res.json(profile);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /api/players/profile
   * Update current user's profile
   * Requires authentication
   */
  router.put(
    '/players/profile',
    conditionalAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Use externalId (Clerk user ID) for profile, not PlayerIdentity ID
        const userId = req.user!.externalId || req.user!.id;
        const { displayName } = req.body;

        // Validate request body
        if (!displayName || typeof displayName !== 'string') {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'displayName is required',
            },
          });
          return;
        }

        // Check if profile exists
        const existingProfile = await playerProfileService.getProfile(userId);
        if (!existingProfile) {
          res.status(404).json({
            error: {
              code: 'PROFILE_NOT_FOUND',
              message: 'Profile not found for this user',
            },
          });
          return;
        }

        // Update profile
        try {
          const updatedProfile = await playerProfileService.updateDisplayName(userId, displayName);
          res.json(updatedProfile);
        } catch (error) {
          // Handle validation errors
          if (error instanceof Error) {
            if (error.message.includes('already taken')) {
              res.status(409).json({
                error: {
                  code: 'DISPLAY_NAME_TAKEN',
                  message: error.message,
                },
              });
              return;
            }
            // Other validation errors
            res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: error.message,
              },
            });
            return;
          }
          throw error;
        }
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/players/:userId/profile
   * Get player profile by user ID (public endpoint)
   * No authentication required
   */
  router.get(
    '/players/:userId/profile',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { userId } = req.params;

        const profile = await playerProfileService.getProfile(userId);
        if (!profile) {
          res.status(404).json({
            error: {
              code: 'PROFILE_NOT_FOUND',
              message: 'Profile not found for this user',
            },
          });
          return;
        }

        res.json(profile);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
