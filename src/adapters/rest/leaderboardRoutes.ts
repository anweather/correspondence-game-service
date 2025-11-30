/**
 * Leaderboard Routes
 * REST API endpoints for player leaderboards
 *
 * Endpoints:
 * - GET /api/leaderboard - Get overall leaderboard
 * - GET /api/leaderboard/:gameType - Get leaderboard for specific game type
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Router, Request, Response, NextFunction } from 'express';
import { StatsService } from '@application/services/StatsService';

/**
 * Creates leaderboard routes
 * @param statsService - Service for managing player statistics
 * @returns Express router with leaderboard routes
 */
export function createLeaderboardRoutes(statsService: StatsService): Router {
  const router = Router();

  /**
   * GET /api/leaderboard
   * Get overall leaderboard
   * No authentication required (public endpoint)
   * Query parameters:
   * - limit: Maximum number of entries (optional, default 100, min 1)
   */
  router.get('/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate limit parameter
      let limit = 100; // default

      if (req.query.limit) {
        const parsedLimit = parseInt(req.query.limit as string, 10);

        if (isNaN(parsedLimit)) {
          res.status(400).json({
            error: 'Invalid limit parameter. Must be a number.',
          });
          return;
        }

        if (parsedLimit <= 0) {
          res.status(400).json({
            error: 'Invalid limit parameter. Must be greater than 0.',
          });
          return;
        }

        limit = parsedLimit;
      }

      const leaderboard = await statsService.getLeaderboard(undefined, limit);
      res.json(leaderboard);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/leaderboard/:gameType
   * Get leaderboard for a specific game type
   * No authentication required (public endpoint)
   * Query parameters:
   * - limit: Maximum number of entries (optional, default 100, min 1)
   */
  router.get('/leaderboard/:gameType', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gameType } = req.params;

      // Parse and validate limit parameter
      let limit = 100; // default

      if (req.query.limit) {
        const parsedLimit = parseInt(req.query.limit as string, 10);

        if (isNaN(parsedLimit)) {
          res.status(400).json({
            error: 'Invalid limit parameter. Must be a number.',
          });
          return;
        }

        if (parsedLimit <= 0) {
          res.status(400).json({
            error: 'Invalid limit parameter. Must be greater than 0.',
          });
          return;
        }

        limit = parsedLimit;
      }

      const leaderboard = await statsService.getLeaderboard(gameType, limit);
      res.json(leaderboard);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
