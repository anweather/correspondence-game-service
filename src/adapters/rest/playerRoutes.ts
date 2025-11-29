import { Router, Request, Response, NextFunction } from 'express';
import { PlayerIdentityRepository } from '@domain/interfaces/PlayerIdentityRepository';

/**
 * Creates player identity routes
 * @param playerIdentityRepo - Repository for player identities
 * @returns Express router with player identity routes
 */
export function createPlayerRoutes(playerIdentityRepo: PlayerIdentityRepository): Router {
  const router = Router();

  /**
   * POST /api/players/identity
   * Get or create a player identity by name
   * When authenticated, returns the authenticated user's player identity
   */
  router.post('/players/identity', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If user is authenticated, return their player identity from req.user
      // This was populated by the Clerk middleware
      console.log('[PlayerRoutes] req.user:', (req as any).user);

      if ((req as any).user) {
        const authenticatedUser = (req as any).user;
        console.log('[PlayerRoutes] Returning authenticated user identity:', authenticatedUser.id);
        res.json({
          id: authenticatedUser.id,
          name: authenticatedUser.username || authenticatedUser.email || 'Player',
        });
        return;
      }

      console.log('[PlayerRoutes] No authenticated user, creating random identity');

      // Fallback for non-authenticated users (when AUTH_ENABLED=false)
      const { name } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          error: {
            code: 'INVALID_NAME',
            message: 'Player name is required',
          },
        });
        return;
      }

      const identity = await playerIdentityRepo.getOrCreate(name);

      res.json({
        id: identity.id,
        name: identity.name,
        createdAt: identity.createdAt.toISOString(),
        lastUsed: identity.lastUsed.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/players/known
   * Get list of known player names
   */
  router.get('/players/known', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const identities = await playerIdentityRepo.findAll();

      res.json({
        players: identities.map((identity) => ({
          name: identity.name,
          lastUsed: identity.lastUsed.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
