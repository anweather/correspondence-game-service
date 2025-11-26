import { Router, Request, Response, NextFunction } from 'express';
import { GameManagerService } from '@application/services/GameManagerService';
import { StateManagerService } from '@application/services/StateManagerService';
import { RendererService } from '@infrastructure/rendering/RendererService';
import { GameRepository } from '@domain/interfaces';
import { GameNotFoundError } from '@domain/errors';
import { requireAuth } from './auth/requireAuth';
import { requireGameParticipant } from './auth/requireGameParticipant';
import { AuthenticatedRequest } from './auth/types';

import { loadConfig } from '../../config';

/**
 * Creates game management and gameplay routes
 * @param gameManagerService - Service for managing games
 * @param gameRepository - Repository for game persistence
 * @param stateManagerService - Service for managing game state and moves
 * @param rendererService - Service for rendering game boards (optional)
 * @returns Express router with game management and gameplay routes
 */
export function createGameRoutes(
  gameManagerService: GameManagerService,
  gameRepository: GameRepository,
  stateManagerService: StateManagerService,
  rendererService?: RendererService
): Router {
  const router = Router();
  const config = loadConfig();

  // Helper to conditionally apply auth middleware
  const authMiddleware = config.auth.enabled ? [requireAuth] : [];
  const participantMiddleware = config.auth.enabled
    ? [requireAuth, requireGameParticipant(gameRepository)]
    : [];

  /**
   * POST /api/games
   * Create a new game instance
   * Requires authentication (when enabled)
   */
  router.post(
    '/games',
    ...authMiddleware,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { gameType, config } = req.body;
        // Extract authenticated user from request (if auth is enabled)
        const user = req.user; // May be undefined if auth is disabled

        // Pass user to GameManagerService (will be used for creator association)
        const game = await gameManagerService.createGame(gameType, config || {}, user);
        res.status(201).json(game);
      } catch (error) {
        next(error);
      }
    }
  );

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

  // ========== Gameplay Endpoints ==========

  /**
   * GET /api/games/:gameId/state
   * Get current game state
   */
  router.get('/games/:gameId/state', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const game = await gameRepository.findById(req.params.gameId);
      if (!game) {
        throw new GameNotFoundError(req.params.gameId);
      }
      res.json(game);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/games/:gameId/moves
   * Apply a move to a game
   * Requires authentication and game participation (when enabled)
   */
  router.post(
    '/games/:gameId/moves',
    ...participantMiddleware,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { playerId, move, version } = req.body;
        const updatedState = await stateManagerService.applyMove(
          req.params.gameId,
          playerId,
          move,
          version
        );
        res.json(updatedState);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/games/:gameId/moves
   * Get move history for a game
   */
  router.get('/games/:gameId/moves', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const game = await gameRepository.findById(req.params.gameId);
      if (!game) {
        throw new GameNotFoundError(req.params.gameId);
      }
      res.json(game.moveHistory);
    } catch (error) {
      next(error);
    }
  });

  // ========== Rendering Endpoints ==========

  /**
   * GET /api/games/:gameId/board.svg
   * Get SVG rendering of game board
   */
  if (rendererService) {
    router.get(
      '/games/:gameId/board.svg',
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const svg = await rendererService.renderGame(req.params.gameId);
          res.setHeader('Content-Type', 'image/svg+xml');
          res.send(svg);
        } catch (error) {
          next(error);
        }
      }
    );
  }

  return router;
}
