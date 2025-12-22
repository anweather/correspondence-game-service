import { Router, Request, Response, NextFunction } from 'express';
import { GameManagerService } from '@application/services/GameManagerService';
import { StateManagerService } from '@application/services/StateManagerService';
import { RendererService } from '@infrastructure/rendering/RendererService';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { GameRepository } from '@domain/interfaces';
import { GameNotFoundError } from '@domain/errors';
import { requireGameParticipant } from './auth/requireGameParticipant';
import { createConditionalAuth } from './auth/conditionalAuth';
import { AuthenticatedRequest } from './auth/types';

/**
 * Creates game management and gameplay routes
 * @param gameManagerService - Service for managing games
 * @param gameRepository - Repository for game persistence
 * @param stateManagerService - Service for managing game state and moves
 * @param aiPlayerService - Service for AI player management
 * @param rendererService - Service for rendering game boards (optional)
 * @param options - Configuration options for routes
 * @returns Express router with game management and gameplay routes
 */
export function createGameRoutes(
  gameManagerService: GameManagerService,
  gameRepository: GameRepository,
  stateManagerService: StateManagerService,
  aiPlayerService: AIPlayerService,
  rendererService?: RendererService,
  options: { disableAuth?: boolean } = {}
): Router {
  const router = Router();

  // Create conditional auth middleware based on options
  const conditionalAuth = createConditionalAuth(!options.disableAuth);
  const conditionalGameParticipant = options.disableAuth
    ? (_req: AuthenticatedRequest, _res: Response, next: NextFunction): void => next()
    : requireGameParticipant(gameRepository);

  /**
   * POST /api/games
   * Create a new game instance
   * Requires authentication (when enabled)
   * Accepts optional gameName and gameDescription for game metadata
   * Supports AI player configuration through config.aiPlayers
   */
  router.post(
    '/games',
    conditionalAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { gameType, config, gameName, gameDescription } = req.body;

        // Validate game name if provided
        if (gameName !== undefined && gameName !== null) {
          if (typeof gameName !== 'string' || gameName.trim() === '') {
            res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Game name is required',
              },
            });
            return;
          }
        }

        // Validate game description length if provided
        if (gameDescription !== undefined && gameDescription !== null) {
          if (typeof gameDescription !== 'string') {
            res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Game description must be a string',
              },
            });
            return;
          }
          if (gameDescription.length > 500) {
            res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Game description must not exceed 500 characters',
              },
            });
            return;
          }
        }

        // Validate AI player configurations if provided
        if (config?.aiPlayers) {
          if (!Array.isArray(config.aiPlayers)) {
            res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'AI players must be an array',
              },
            });
            return;
          }

          for (let i = 0; i < config.aiPlayers.length; i++) {
            const aiPlayer = config.aiPlayers[i];

            if (!aiPlayer || typeof aiPlayer !== 'object') {
              res.status(400).json({
                error: {
                  code: 'VALIDATION_ERROR',
                  message: `AI player at index ${i} must be an object`,
                },
              });
              return;
            }

            if (
              !aiPlayer.name ||
              typeof aiPlayer.name !== 'string' ||
              aiPlayer.name.trim() === ''
            ) {
              res.status(400).json({
                error: {
                  code: 'VALIDATION_ERROR',
                  message: `AI player at index ${i} must have a non-empty name`,
                },
              });
              return;
            }

            if (
              aiPlayer.strategyId !== undefined &&
              (typeof aiPlayer.strategyId !== 'string' || aiPlayer.strategyId.trim() === '')
            ) {
              res.status(400).json({
                error: {
                  code: 'VALIDATION_ERROR',
                  message: `AI player at index ${i} strategyId must be a non-empty string if provided`,
                },
              });
              return;
            }

            if (
              aiPlayer.difficulty !== undefined &&
              (typeof aiPlayer.difficulty !== 'string' || aiPlayer.difficulty.trim() === '')
            ) {
              res.status(400).json({
                error: {
                  code: 'VALIDATION_ERROR',
                  message: `AI player at index ${i} difficulty must be a non-empty string if provided`,
                },
              });
              return;
            }

            if (
              aiPlayer.configuration !== undefined &&
              (typeof aiPlayer.configuration !== 'object' || Array.isArray(aiPlayer.configuration))
            ) {
              res.status(400).json({
                error: {
                  code: 'VALIDATION_ERROR',
                  message: `AI player at index ${i} configuration must be an object if provided`,
                },
              });
              return;
            }
          }
        }

        // Extract authenticated user from request (if auth is enabled)
        const user = req.user; // May be undefined if auth is disabled

        // Pass user and metadata to GameManagerService
        const game = await gameManagerService.createGame(
          gameType,
          config || {},
          user,
          gameName,
          gameDescription
        );
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

  /**
   * GET /api/game-types/:gameType/ai-strategies
   * Get available AI strategies for a specific game type
   */
  router.get(
    '/game-types/:gameType/ai-strategies',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { gameType } = req.params;
        const strategies = aiPlayerService.getAvailableStrategies(gameType);
        res.json(strategies);
      } catch (error) {
        next(error);
      }
    }
  );

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
   * Automatically processes AI turns after human moves
   */
  router.post(
    '/games/:gameId/moves',
    conditionalAuth,
    conditionalGameParticipant,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { playerId, move, version } = req.body;
        // StateManagerService.applyMove() handles both the human move and subsequent AI turns
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
