/**
 * Tic-Tac-Toe Game Engine
 * 
 * Main engine class that orchestrates all game modules and implements
 * the BaseGameEngine interface. This class maintains backward compatibility
 * with the existing API while delegating to specialized modules.
 */

import { BaseGameEngine, AICapableGamePlugin, AIStrategy } from '@domain/interfaces';
import { GameState, Player, Move } from '@domain/models';
import { GameConfig, ValidationResult, BoardRenderData } from '@domain/interfaces';
import { AIPlayer } from '@domain/models/AIPlayer';

// Import all module functions
import * as metadata from './metadata';
import * as initialization from './initialization';
import * as validation from './validation';
import * as rules from './rules';
import * as renderer from './renderer';

// Import AI strategies
import { PerfectPlayStrategy, EasyStrategy } from '../ai';

/**
 * Tic-Tac-Toe game engine implementation
 * 
 * This class acts as a facade, providing a clean interface to the game
 * while delegating to specialized modules for specific functionality.
 * Also implements AI capabilities through the AICapableGamePlugin interface.
 */
export class TicTacToeEngine extends BaseGameEngine implements AICapableGamePlugin {
  private aiStrategies: AIStrategy[];
  private defaultStrategy: AIStrategy;

  constructor() {
    super();
    // Initialize AI strategies
    this.aiStrategies = [
      new PerfectPlayStrategy(),
      new EasyStrategy()
    ];
    this.defaultStrategy = this.aiStrategies[0]; // Perfect play as default
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

  // ===== AI Capabilities =====

  /**
   * Check if this game plugin supports AI players
   * @returns true - Tic-Tac-Toe supports AI players
   */
  supportsAI(): boolean {
    return true;
  }

  /**
   * Get available AI strategies for Tic-Tac-Toe
   * @returns Array of available AI strategies
   */
  getAIStrategies(): AIStrategy[] {
    return [...this.aiStrategies]; // Return copy to prevent external modification
  }

  /**
   * Get default AI strategy for Tic-Tac-Toe
   * @returns Default AI strategy (Perfect Play)
   */
  getDefaultAIStrategy(): AIStrategy {
    return this.defaultStrategy;
  }

  /**
   * Create an AI player for Tic-Tac-Toe
   * @param name Display name for the AI player
   * @param strategyId ID of the strategy to use (optional, uses default if not provided)
   * @param difficulty Optional difficulty level
   * @returns AI player configuration
   */
  createAIPlayer(name: string, strategyId?: string, difficulty?: string): AIPlayer {
    // Find the requested strategy or use default
    let strategy = this.defaultStrategy;
    if (strategyId) {
      const foundStrategy = this.aiStrategies.find(s => s.id === strategyId);
      if (!foundStrategy) {
        throw new Error(`AI strategy '${strategyId}' not found for Tic-Tac-Toe`);
      }
      strategy = foundStrategy;
    }

    // If difficulty is specified, try to find a strategy with that difficulty
    if (difficulty && !strategyId) {
      const difficultyStrategy = this.aiStrategies.find(s => s.difficulty === difficulty);
      if (difficultyStrategy) {
        strategy = difficultyStrategy;
      }
    }

    return new AIPlayer(
      `ai-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      this.getGameType(),
      strategy.id,
      difficulty || strategy.difficulty
    );
  }
}
