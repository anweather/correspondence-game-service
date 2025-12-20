import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { GameRepository, ValidationResult } from '@domain/interfaces';
import { GameState, Move, GameLifecycle } from '@domain/models';
import { GameNotFoundError, InvalidMoveError, UnauthorizedMoveError } from '@domain/errors';
import {
  IWebSocketService,
  WebSocketMessageType,
  GameUpdateMessage,
  GameCompleteMessage,
} from '@domain/interfaces/IWebSocketService';

/**
 * Service for managing game state updates and move processing
 * Handles move validation, application, and concurrency control
 */
export class StateManagerService {
  constructor(
    private repository: GameRepository,
    private registry: PluginRegistry,
    private lockManager: GameLockManager,
    private webSocketService?: IWebSocketService,
    private aiPlayerService?: AIPlayerService
  ) {}

  /**
   * Validate a move without applying it
   * @param gameId - The game ID
   * @param playerId - The player making the move
   * @param move - The move to validate
   * @returns Validation result
   * @throws GameNotFoundError if game not found
   */
  async validateMove(gameId: string, playerId: string, move: Move): Promise<ValidationResult> {
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

      // Check if game is in a playable state
      if (game.lifecycle === GameLifecycle.COMPLETED) {
        throw new InvalidMoveError('Game is already completed');
      }

      if (game.lifecycle !== GameLifecycle.ACTIVE) {
        throw new InvalidMoveError(
          `Game must be active to make moves. Current state: ${game.lifecycle}`
        );
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
        throw new InvalidMoveError(validationResult.reason || 'Move validation failed');
      }

      // Enrich move with playerId and timestamp
      const enrichedMove: Move = {
        ...move,
        playerId,
        timestamp: new Date(),
      };

      // Apply move (game engine handles turn advancement internally)
      let updatedState = plugin.applyMove(game, playerId, enrichedMove);

      // Check if game is over
      if (plugin.isGameOver(updatedState)) {
        const winner = plugin.getWinner(updatedState);
        const isDraw = winner === null;

        updatedState = {
          ...updatedState,
          lifecycle: GameLifecycle.COMPLETED,
          winner,
          metadata: {
            ...updatedState.metadata,
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
      const savedState = await this.repository.update(gameId, updatedState, expectedVersion);

      // Broadcast game update via WebSocket (non-blocking)
      if (this.webSocketService) {
        this.broadcastGameUpdate(gameId, savedState, false).catch((error) => {
          // Log error but don't fail the move
          console.error(`Failed to broadcast game update for ${gameId}:`, error);
        });
      }

      // Invoke afterApplyMove hook if present
      if (plugin.afterApplyMove) {
        plugin.afterApplyMove(game, savedState, move);
      }

      // Invoke onGameEnded hook if game just completed
      if (savedState.lifecycle === GameLifecycle.COMPLETED) {
        plugin.onGameEnded(savedState);

        // Broadcast game completion
        if (this.webSocketService) {
          this.broadcastGameComplete(gameId, savedState.winner, savedState).catch((error) => {
            console.error(`Failed to broadcast game completion for ${gameId}:`, error);
          });
        }
      }

      // Process AI turns if needed (only if game is still active)
      let finalState = savedState;
      if (savedState.lifecycle === GameLifecycle.ACTIVE) {
        finalState = await this.processAITurnsIfNeeded(savedState);
      }

      return finalState;
    });
  }

  /**
   * Process consecutive AI turns until human player or game end
   * @private
   */
  private async processAITurnsIfNeeded(state: GameState): Promise<GameState> {
    if (!this.aiPlayerService) {
      return state; // No AI service available
    }

    let currentState = state;
    const maxIterations = 10; // Safety limit to prevent infinite loops
    let iterations = 0;

    while (currentState.lifecycle === GameLifecycle.ACTIVE && iterations < maxIterations) {
      iterations++;

      const plugin = this.registry.get(currentState.gameType);
      if (!plugin) {
        break; // No plugin available
      }

      const currentPlayerId = plugin.getCurrentPlayer(currentState);
      if (!currentPlayerId) {
        break; // No current player
      }

      if (!(await this.aiPlayerService.isAIPlayer(currentPlayerId))) {
        break; // Human player's turn
      }

      try {
        // Process AI turn - this will handle move generation, validation, and application
        await this.aiPlayerService.processAITurn(currentState.gameId, currentPlayerId);

        // Fetch fresh state from repository to ensure we have the latest version
        const freshState = await this.repository.findById(currentState.gameId);
        if (!freshState) {
          break; // Game not found
        }

        currentState = freshState;

        // Broadcast AI move update via WebSocket (non-blocking)
        if (this.webSocketService) {
          this.broadcastGameUpdate(currentState.gameId, currentState, true).catch((error) => {
            console.error(`Failed to broadcast AI move update for ${currentState.gameId}:`, error);
          });
        }

        // Check if game ended after AI move
        if (plugin.isGameOver(currentState)) {
          const winner = plugin.getWinner(currentState);
          const isDraw = winner === null;

          currentState = {
            ...currentState,
            lifecycle: GameLifecycle.COMPLETED,
            winner,
            metadata: {
              ...currentState.metadata,
              isDraw,
            },
            updatedAt: new Date(),
          };

          // Save the completed state
          await this.repository.update(currentState.gameId, currentState, currentState.version);

          // Invoke onGameEnded hook
          plugin.onGameEnded(currentState);

          // Broadcast game completion
          if (this.webSocketService) {
            this.broadcastGameComplete(currentState.gameId, currentState.winner, currentState).catch((error) => {
              console.error(
                `Failed to broadcast game completion for ${currentState.gameId}:`,
                error
              );
            });
          }

          break; // Game ended
        }
      } catch (error) {
        // Log AI error but don't fail the entire operation
        console.error(
          `AI turn processing failed for player ${currentPlayerId} in game ${currentState.gameId}:`,
          error
        );
        break; // Stop processing AI turns on error
      }
    }

    if (iterations >= maxIterations) {
      console.warn(
        `AI turn processing stopped after ${maxIterations} iterations to prevent infinite loop in game ${currentState.gameId}`
      );
    }

    return currentState;
  }

  /**
   * Broadcast game update to all subscribers
   * @param gameId - The game ID
   * @param gameState - The updated game state
   * @param lastMoveByAI - Whether the last move was made by an AI player
   */
  private async broadcastGameUpdate(
    gameId: string,
    gameState: GameState,
    lastMoveByAI?: boolean
  ): Promise<void> {
    if (!this.webSocketService) {
      return;
    }

    const message: GameUpdateMessage = {
      type: WebSocketMessageType.GAME_UPDATE,
      gameId,
      gameState,
      lastMoveByAI,
      timestamp: new Date(),
    };

    await this.webSocketService.broadcastToGame(gameId, message);
  }

  /**
   * Broadcast game completion to all subscribers
   * @param gameId - The game ID
   * @param winner - The winner player ID (null for draw)
   * @param gameState - The final game state to check if winner is AI
   */
  private async broadcastGameComplete(
    gameId: string,
    winner: string | null,
    gameState?: GameState
  ): Promise<void> {
    if (!this.webSocketService) {
      return;
    }

    let winnerIsAI = false;
    if (winner && gameState) {
      const winnerPlayer = gameState.players.find((p) => p.id === winner);
      winnerIsAI = winnerPlayer?.metadata?.isAI === true;
    }

    const message: GameCompleteMessage = {
      type: WebSocketMessageType.GAME_COMPLETE,
      gameId,
      winner,
      winnerIsAI,
      timestamp: new Date(),
    };

    await this.webSocketService.broadcastToGame(gameId, message);
  }
}
