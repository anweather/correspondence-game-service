import { GameState, Move } from '@domain/models';

/**
 * AI Strategy interface implemented by game plugins
 * Defines the contract for AI move generation algorithms
 */
export interface AIStrategy {
  /** Unique identifier for this strategy */
  readonly id: string;

  /** Human-readable name for this strategy */
  readonly name: string;

  /** Description of what this strategy does */
  readonly description: string;

  /** Optional difficulty level indicator */
  readonly difficulty?: string;

  /**
   * Generate a move for the AI player
   * @param state Current game state
   * @param aiPlayerId ID of the AI player making the move
   * @returns Promise resolving to a valid move
   * @throws Error if move generation fails
   */
  generateMove(state: GameState, aiPlayerId: string): Promise<Move>;

  /**
   * Validate AI-specific configuration
   * @param config Configuration to validate
   * @returns true if valid, false otherwise
   */
  validateConfiguration?(config: Record<string, any>): boolean;

  /**
   * Get the maximum time this strategy should take to generate a move (in milliseconds)
   * @returns Maximum time limit, or undefined for default timeout
   */
  getTimeLimit?(): number;
}

/**
 * Configuration for creating AI players
 */
export interface AIPlayerConfig {
  name: string;
  strategyId?: string; // Optional - uses default if not specified
  difficulty?: string;
  configuration?: Record<string, any>;
}

/**
 * AI move generation context
 * Provides additional context for AI move generation
 */
export interface AIMoveContext {
  gameState: GameState;
  aiPlayerId: string;
  timeLimit?: number; // milliseconds
  retryCount?: number;
  previousAttempts?: Move[]; // Previous invalid moves attempted
}
