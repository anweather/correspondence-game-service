import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { GameRepository, ValidationResult } from '@domain/interfaces';
import { GameState, Move, GameLifecycle } from '@domain/models';
import {
  GameNotFoundError,
  InvalidMoveError,
  UnauthorizedMoveError,
} from '@domain/errors';

/**
 * Service for managing game state updates and move processing
 * Handles move validation, application, and concurrency control
 */
export class StateManagerService {
  constructor(
    private repository: GameRepository,
    private registry: PluginRegistry,
    private lockManager: GameLockManager
  ) {}

  /**
   * Validate a move without applying it
   * @param gameId - The game ID
   * @param playerId - The player making the move
   * @param move - The move to validate
   * @returns Validation result
   * @throws GameNotFoundError if game not found
   */
  async validateMove(
    gameId: string,
    playerId: string,
    move: Move
  ): Promise<ValidationResult> {
    const game = await this.repository.findById(gameId);

    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    const plugin = this.registry.get(game.gameType);
    if (!plugin) {
      throw new Error(`Game type "${game.gameType}" is not supported`);
    }

    // Delegate to plugin
    return plugin.validateMove(game, playerId, move);
  }

  /**
   * Apply a move to a game with concurrency control
   * @param gameId - The game ID
   * @param playerId - The player making the move
   * @param move - The move to apply
   * @param expectedVersion - Expected version for optimistic locking
   * @returns Updated game state
   * @throws GameNotFoundError if game not found
   * @throws UnauthorizedMoveError if player not authorized
   * @throws InvalidMoveError if move is invalid
   * @throws ConcurrencyError if version mismatch
   */
  async applyMove(
    gameId: string,
    playerId: string,
    move: Move,
    expectedVersion: number
  ): Promise<GameState> {
    // Use lock manager to ensure sequential processing per game
    return await this.lockManager.withLock(gameId, async () => {
      // Get current game state
      const game = await this.repository.findById(gameId);

      if (!game) {
        throw new GameNotFoundError(gameId);
      }

      // Get plugin
      const plugin = this.registry.get(game.gameType);
      if (!plugin) {
        throw new Error(`Game type "${game.gameType}" is not supported`);
      }

      // Authorization checks
      // 1. Check if player is in the game
      const playerInGame = game.players.some((p) => p.id === playerId);
      if (!playerInGame) {
        throw new UnauthorizedMoveError(playerId);
      }

      // 2. Check if it's the player's turn
      const currentPlayer = plugin.getCurrentPlayer(game);
      if (currentPlayer !== playerId) {
        throw new UnauthorizedMoveError(playerId);
      }

      // Invoke beforeApplyMove hook if present
      if (plugin.beforeApplyMove) {
        plugin.beforeApplyMove(game, playerId, move);
      }

      // Validate move
      const validationResult = plugin.validateMove(game, playerId, move);
      if (!validationResult.valid) {
        throw new InvalidMoveError(
          validationResult.reason || 'Move validation failed'
        );
      }

      // Apply move
      let updatedState = plugin.applyMove(game, playerId, move);

      // Advance turn if game is not over
      if (!plugin.isGameOver(updatedState)) {
        updatedState = plugin.advanceTurn(updatedState);
      }

      // Check if game is over
      if (plugin.isGameOver(updatedState)) {
        const winner = plugin.getWinner(updatedState);
        const isDraw = winner === null;
        
        updatedState = {
          ...updatedState,
          lifecycle: GameLifecycle.COMPLETED,
          metadata: {
            ...updatedState.metadata,
            winner,
            isDraw,
          },
        };
      }

      // Update timestamps and version
      updatedState = {
        ...updatedState,
        updatedAt: new Date(),
      };

      // Save to repository with optimistic locking
      const savedState = await this.repository.update(
        gameId,
        updatedState,
        expectedVersion
      );

      // Invoke afterApplyMove hook if present
      if (plugin.afterApplyMove) {
        plugin.afterApplyMove(game, savedState, move);
      }

      // Invoke onGameEnded hook if game just completed
      if (savedState.lifecycle === GameLifecycle.COMPLETED) {
        plugin.onGameEnded(savedState);
      }

      return savedState;
    });
  }
}
