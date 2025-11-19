import { Router, Request, Response, NextFunction } from 'express';
import { GameManagerService } from '@application/services/GameManagerService';
import { GameRepository } from '@domain/interfaces';
import { GameNotFoundError } from '@domain/errors';

/**
 * Creates game management routes
 * @param gameManagerService - Service for managing games
 * @param gameRepository - Repository for game persistence
 * @returns Express router with game management routes
 */
export function createGameRoutes(
  gameManagerService: GameManagerService,
  gameRepository: GameRepository
): Router {
  const router = Router();

  /**
   * POST /api/games
   * Create a new game instance
   */
  router.post('/games', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gameType, config } = req.body;
      const game = await gameManagerService.createGame(gameType, config || {});
      res.status(201).json(game);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/games
   * List games with optional filtering and pagination
   */
  router.get('/games', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        playerId: req.query.playerId as string | undefined,
        lifecycle: req.query.lifecycle as string | undefined,
        gameType: req.query.gameType as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };
      const result = await gameManagerService.listGames(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/games/:gameId
   * Get a specific game by ID
   */
  router.get('/games/:gameId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const game = await gameManagerService.getGame(req.params.gameId);
      if (!game) {
        throw new GameNotFoundError(req.params.gameId);
      }
      res.json(game);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/games/:gameId/join
   * Add a player to a game
   */
  router.post('/games/:gameId/join', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { player } = req.body;
      const game = await gameManagerService.joinGame(req.params.gameId, player);
      res.json(game);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/games/:gameId
   * Delete a game instance
   */
  router.delete('/games/:gameId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await gameRepository.delete(req.params.gameId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/game-types
   * List all available game types
   */
  router.get('/game-types', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const gameTypes = gameManagerService.listAvailableGameTypes();
      res.json(gameTypes);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
