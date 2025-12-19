import { Player } from './index';

/**
 * AI Player domain model
 * Represents a computer-controlled game participant that makes moves automatically
 * according to game-specific algorithms.
 */
export class AIPlayer {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly gameType: string,
    public readonly strategyId: string,
    public readonly difficulty?: string,
    public readonly configuration?: Record<string, any>,
    public readonly createdAt: Date = new Date()
  ) {
    if (!id || id.trim() === '') {
      throw new Error('AI Player ID cannot be empty');
    }
    if (!name || name.trim() === '') {
      throw new Error('AI Player name cannot be empty');
    }
    if (!gameType || gameType.trim() === '') {
      throw new Error('AI Player gameType cannot be empty');
    }
    if (!strategyId || strategyId.trim() === '') {
      throw new Error('AI Player strategyId cannot be empty');
    }
  }

  /**
   * Create a regular Player object for game participation
   * This allows AI players to participate in games using the existing Player interface
   */
  toPlayer(): Player {
    return {
      id: this.id,
      name: this.name,
      joinedAt: this.createdAt,
      metadata: {
        isAI: true,
        strategyId: this.strategyId,
        difficulty: this.difficulty,
        configuration: this.configuration,
      },
    };
  }

  /**
   * Check if this AI player uses a specific strategy
   */
  usesStrategy(strategyId: string): boolean {
    return this.strategyId === strategyId;
  }

  /**
   * Check if this AI player is configured for a specific game type
   */
  isForGameType(gameType: string): boolean {
    return this.gameType === gameType;
  }
}
