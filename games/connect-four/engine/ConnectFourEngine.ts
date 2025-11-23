/**
 * Connect Four Game Engine
 * 
 * Main engine class that orchestrates all game modules and implements
 * the BaseGameEngine interface. This class maintains compatibility with
 * the game service API while delegating to specialized modules.
 * 
 * Requirements: 10.1
 */

import { BaseGameEngine } from '../../../src/domain/interfaces';
import { GameState, Player, Move } from '../../../src/domain/models';
import { GameConfig, ValidationResult, BoardRenderData } from '../../../src/domain/interfaces';
import { ConnectFourMetadata, ConnectFourMove } from '../shared/types';

// Import all module functions
import * as metadata from './metadata';
import * as initialization from './initialization';
import * as validation from './validation';
import * as rules from './rules';
import * as renderer from './renderer';

/**
 * Connect Four game engine implementation
 * 
 * This class acts as a facade, providing a clean interface to the game
 * while delegating to specialized modules for specific functionality.
 */
export class ConnectFourEngine extends BaseGameEngine {
  // ===== Private Helper Methods =====

  /**
   * Generates a unique game ID
   * @param config - Game configuration that may contain a custom game ID
   * @returns A unique game ID
   */
  private generateGameId(config: GameConfig): string {
    return (
      config.customSettings?.gameId ||
      `connect-four-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }

  /**
   * Maps a player color to the corresponding player ID
   * @param state - Current game state
   * @param color - Player color to map
   * @returns Player ID or null if not found
   */
  private getPlayerIdByColor(
    state: GameState<ConnectFourMetadata>,
    color: string
  ): string | null {
    const playerColors = initialization.assignPlayerColors(state.players);

    for (const [playerId, playerColor] of playerColors.entries()) {
      if (playerColor === color) {
        return playerId;
      }
    }

    return null;
  }

  // ===== Metadata Methods =====

  getGameType(): string {
    return metadata.getGameType();
  }

  getMinPlayers(): number {
    return metadata.getMinPlayers();
  }

  getMaxPlayers(): number {
    return metadata.getMaxPlayers();
  }

  getDescription(): string {
    return metadata.getDescription();
  }

  // ===== Game Initialization =====

  initializeGame(players: Player[], config: GameConfig): GameState<ConnectFourMetadata> {
    const gameId = this.generateGameId(config);
    return initialization.initializeGame(gameId, players);
  }

  // ===== Move Validation =====

  validateMove(
    state: GameState<ConnectFourMetadata>,
    playerId: string,
    move: Move
  ): ValidationResult {
    // Cast move to ConnectFourMove for type safety
    const connectFourMove = move as ConnectFourMove;
    
    const result = validation.validateMove(state, playerId, connectFourMove);
    
    // Convert validation result format
    return {
      valid: result.valid,
      reason: result.error,
    };
  }

  // ===== Game Rules and State Transitions =====

  applyMove(
    state: GameState<ConnectFourMetadata>,
    playerId: string,
    move: Move
  ): GameState<ConnectFourMetadata> {
    // Cast move to ConnectFourMove and add playerId
    const connectFourMove: ConnectFourMove = {
      ...(move as ConnectFourMove),
      playerId,
    };
    
    return rules.applyMove(state, connectFourMove);
  }

  isGameOver(state: GameState<ConnectFourMetadata>): boolean {
    return rules.isGameOver(state.metadata.board);
  }

  getWinner(state: GameState<ConnectFourMetadata>): string | null {
    const winningColor = rules.getWinner(state.metadata.board);

    if (!winningColor) {
      return null;
    }

    // Map color back to player ID
    return this.getPlayerIdByColor(state, winningColor);
  }

  // ===== Board Rendering =====

  renderBoard(state: GameState<ConnectFourMetadata>): BoardRenderData {
    return renderer.renderBoard(state);
  }
}
