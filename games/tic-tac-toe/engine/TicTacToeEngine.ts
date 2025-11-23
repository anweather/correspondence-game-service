/**
 * Tic-Tac-Toe Game Engine
 * 
 * Main engine class that orchestrates all game modules and implements
 * the BaseGameEngine interface. This class maintains backward compatibility
 * with the existing API while delegating to specialized modules.
 */

import { BaseGameEngine } from '@domain/interfaces';
import { GameState, Player, Move } from '@domain/models';
import { GameConfig, ValidationResult, BoardRenderData } from '@domain/interfaces';

// Import all module functions
import * as metadata from './metadata';
import * as initialization from './initialization';
import * as validation from './validation';
import * as rules from './rules';
import * as renderer from './renderer';

/**
 * Tic-Tac-Toe game engine implementation
 * 
 * This class acts as a facade, providing a clean interface to the game
 * while delegating to specialized modules for specific functionality.
 */
export class TicTacToeEngine extends BaseGameEngine {
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

  initializeGame(players: Player[], config: GameConfig): GameState {
    return initialization.initializeGame(players, config);
  }

  // ===== Move Validation =====

  validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
    return validation.validateMove(state, playerId, move);
  }

  // ===== Game Rules and State Transitions =====

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    return rules.applyMove(state, playerId, move);
  }

  isGameOver(state: GameState): boolean {
    return rules.isGameOver(state);
  }

  getWinner(state: GameState): string | null {
    return rules.getWinner(state);
  }

  // ===== Board Rendering =====

  renderBoard(state: GameState): BoardRenderData {
    return renderer.renderBoard(state);
  }
}
