import { Router, Request, Response, NextFunction } from 'express';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';

/**
 * Creates player identity routes
 * @param playerIdentityRepo - Repository for player identities
 * @returns Express router with player identity routes
 */
export function createPlayerRoutes(playerIdentityRepo: InMemoryPlayerIdentityRepository): Router {
  const router = Router();

  /**
   * POST /api/players/identity
   * Get or create a player identity by name
   */
  router.post('/players/identity', async (req: Request, res: Response, next: NextFunction) => {
    try {
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
