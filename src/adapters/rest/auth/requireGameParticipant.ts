/**
 * requireGameParticipant middleware
 * Ensures that an authenticated user is a participant in a specific game
 *
 * Responsibilities:
 * - Check user is participant in game
 * - Return 403 if not authorized
 * - Use domain logic for authorization
 *
 * Requirements: 6.3, 8.5
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './types';
import { GameRepository } from '../../../domain/interfaces';

/**
 * Middleware factory that requires the authenticated user to be a participant in a game
 * Returns 403 if user is not a participant
 * Returns 404 if game does not exist
 * Returns 401 if user is not authenticated
 *
 * @param gameRepository - Repository to query game state
 * @param gameIdParam - Name of the route parameter containing the game ID (default: 'gameId')
 * @returns Express middleware function
 */
export function requireGameParticipant(
  gameRepository: GameRepository,
  gameIdParam: string = 'gameId'
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        });
        return;
      }

      // Get game ID from route parameters
      const gameId = req.params[gameIdParam];

      if (!gameId) {
        res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: `Missing ${gameIdParam} parameter`,
          },
        });
        return;
      }

      // Find the game
      const game = await gameRepository.findById(gameId);

      if (!game) {
        res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found',
          },
        });
        return;
      }

      // Check if user is a participant in the game
      const isParticipant = game.players.some((player) => player.id === req.user!.id);

      if (!isParticipant) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Forbidden: Not a participant in this game',
          },
        });
        return;
      }

      // User is a participant, proceed
      next();
    } catch (error) {
      // Pass error to error handler middleware
      next(error);
    }
  };
}
