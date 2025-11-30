/**
 * Stats Routes
 * REST API endpoints for player statistics and game history
 *
 * Endpoints:
 * - GET /api/players/stats - Get current user's stats
 * - GET /api/players/stats/:gameType - Get stats for specific game type
 * - GET /api/players/history - Get game history
 * - GET /api/players/:userId/stats - Get stats for specific player (public)
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Router, Response, NextFunction } from 'express';
import { StatsService } from '@application/services/StatsService';
import { requireAuth } from './auth/requireAuth';
import { AuthenticatedRequest } from './auth/types';
import { GameLifecycle } from '@domain/models';

/**
 * Creates stats routes
 * @param statsService - Service for managing player statistics
 * @returns Express router with stats routes
 */
export function createStatsRoutes(statsService: StatsService): Router {
  const router = Router();

  /**
   * GET /api/players/stats
   * Get current user's statistics
   * Requires authentication
   */
  router.get(
    '/players/stats',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Use externalId (Clerk user ID) for stats, not PlayerIdentity ID
        const userId = req.user!.externalId || req.user!.id;

        const stats = await statsService.getPlayerStats(userId);
        res.json(stats);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/players/stats/:gameType
   * Get current user's statistics for a specific game type
   * Requires authentication
   */
  router.get(
    '/players/stats/:gameType',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Use externalId (Clerk user ID) for stats, not PlayerIdentity ID
        const userId = req.user!.externalId || req.user!.id;
        const { gameType } = req.params;

        const stats = await statsService.getPlayerStats(userId, gameType);
        res.json(stats);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/players/history
   * Get current user's game history
   * Requires authentication
   * Query parameters:
   * - gameType: Filter by game type (optional)
   * - lifecycle: Filter by lifecycle (optional)
   * - page: Page number for pagination (optional, default 1)
   * - pageSize: Number of results per page (optional, default 20)
   */
  router.get(
    '/players/history',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Use externalId (Clerk user ID) for history, not PlayerIdentity ID
        const userId = req.user!.externalId || req.user!.id;

        // Parse query parameters
        const filters: any = {};

        if (req.query.gameType) {
          filters.gameType = req.query.gameType as string;
        }

        if (req.query.lifecycle) {
          filters.lifecycle = req.query.lifecycle as GameLifecycle;
        }

        if (req.query.page) {
          filters.page = parseInt(req.query.page as string, 10);
        }

        if (req.query.pageSize) {
          filters.pageSize = parseInt(req.query.pageSize as string, 10);
        }

        const games = await statsService.getGameHistory(userId, filters);
        res.json(games);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/players/:userId/stats
   * Get player statistics by user ID (public endpoint)
   * No authentication required
   */
  router.get(
    '/players/:userId/stats',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { userId } = req.params;

        const stats = await statsService.getPlayerStats(userId);
        res.json(stats);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
