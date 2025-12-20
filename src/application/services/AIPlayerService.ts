import { PluginRegistry } from '@application/PluginRegistry';
import { IAIPlayerRepository } from '@domain/interfaces/IAIPlayerRepository';
import { GameRepository, AICapableGamePlugin, AIStrategy } from '@domain/interfaces';
import { AIPlayer } from '@domain/models/AIPlayer';
import { GameState, Move } from '@domain/models';
import { AIPlayerConfig } from '@domain/interfaces/IAIStrategy';
import {
  AIStrategyNotFoundError,
  AIMoveGenerationError,
  AITimeoutError,
  InvalidAIConfigurationError,
  GameNotFoundError,
  InvalidMoveError,
} from '@domain/errors';

/**
 * Service for managing AI players and their moves
 * Handles AI player creation, move generation, and strategy management
 */
export class AIPlayerService {
  private readonly DEFAULT_TIMEOUT = 1000; // 1 second default timeout
  private readonly MAX_INVALID_MOVE_RETRIES = 3;
  private readonly MAX_FAILURE_RETRIES = 1;

  constructor(
    private pluginRegistry: PluginRegistry,
    private aiRepository: IAIPlayerRepository,
    private gameRepository: GameRepository
  ) {}

  /**
   * Create AI players for a game
   * @param gameType Type of game
   * @param aiPlayerConfigs Configuration for each AI player
   * @returns Created AI players
   * @throws AIStrategyNotFoundError if strategy not found
   * @throws InvalidAIConfigurationError if configuration is invalid
   */
  async createAIPlayers(gameType: string, aiPlayerConfigs: AIPlayerConfig[]): Promise<AIPlayer[]> {
    const plugin = this.pluginRegistry.get(gameType);
    if (!plugin) {
      throw new Error(`Game type "${gameType}" is not supported`);
    }

    // Check if plugin supports AI
    const aiCapablePlugin = plugin as AICapableGamePlugin;
    if (!aiCapablePlugin.supportsAI || !aiCapablePlugin.supportsAI()) {
      throw new InvalidAIConfigurationError(`Game type "${gameType}" does not support AI players`);
    }

    const createdPlayers: AIPlayer[] = [];

    for (const config of aiPlayerConfigs) {
      // Use default strategy if none specified
      const strategyId = config.strategyId || aiCapablePlugin.getDefaultAIStrategy().id;

      // Validate strategy exists
      const availableStrategies = aiCapablePlugin.getAIStrategies();
      const strategy = availableStrategies.find((s) => s.id === strategyId);
      if (!strategy) {
        throw new AIStrategyNotFoundError(gameType, strategyId);
      }

      // Validate configuration if strategy supports it
      if (strategy.validateConfiguration && config.configuration) {
        if (!strategy.validateConfiguration(config.configuration)) {
          throw new InvalidAIConfigurationError(
            `Invalid configuration for strategy "${strategyId}"`,
            config.configuration
          );
        }
      }

      // Create AI player through repository
      const aiPlayer = await this.aiRepository.create({
        name: config.name,
        gameType,
        strategyId,
        difficulty: config.difficulty,
        configuration: config.configuration,
      });

      createdPlayers.push(aiPlayer);
    }

    return createdPlayers;
  }

  /**
   * Check if a player is an AI player
   * @param playerId Player ID to check
   * @returns true if AI player, false otherwise
   */
  async isAIPlayer(playerId: string): Promise<boolean> {
    const aiPlayer = await this.aiRepository.findById(playerId);
    return aiPlayer !== null;
  }

  /**
   * Get AI strategies available for a game type
   * @param gameType Game type
   * @returns Available AI strategies
   * @throws Error if game type not supported or doesn't support AI
   */
  getAvailableStrategies(gameType: string): AIStrategy[] {
    const plugin = this.pluginRegistry.get(gameType);
    if (!plugin) {
      throw new Error(`Game type "${gameType}" is not supported`);
    }

    const aiCapablePlugin = plugin as AICapableGamePlugin;
    if (!aiCapablePlugin.supportsAI || !aiCapablePlugin.supportsAI()) {
      return [];
    }

    return aiCapablePlugin.getAIStrategies();
  }

  /**
   * Generate and apply AI move when it's AI's turn
   * @param gameId Game ID
   * @param aiPlayerId AI player ID
   * @returns Updated game state
   * @throws GameNotFoundError if game not found
   * @throws AIMoveGenerationError if AI fails to generate valid move
   * @throws AITimeoutError if AI exceeds time limit
   */
  async processAITurn(gameId: string, aiPlayerId: string): Promise<GameState> {
    // Get current game state
    const gameState = await this.gameRepository.findById(gameId);
    if (!gameState) {
      throw new GameNotFoundError(gameId);
    }

    // Get AI player configuration
    const aiPlayer = await this.aiRepository.findById(aiPlayerId);
    if (!aiPlayer) {
      throw new Error(`AI player ${aiPlayerId} not found`);
    }

    // Get game plugin and AI strategy
    const plugin = this.pluginRegistry.get(gameState.gameType);
    if (!plugin) {
      throw new Error(`Game type "${gameState.gameType}" is not supported`);
    }

    const aiCapablePlugin = plugin as AICapableGamePlugin;
    if (!aiCapablePlugin.supportsAI || !aiCapablePlugin.supportsAI()) {
      throw new Error(`Game type "${gameState.gameType}" does not support AI players`);
    }

    const strategies = aiCapablePlugin.getAIStrategies();
    const strategy = strategies.find((s) => s.id === aiPlayer.strategyId);
    if (!strategy) {
      throw new AIStrategyNotFoundError(gameState.gameType, aiPlayer.strategyId);
    }

    // Generate AI move with retry logic
    let move: Move;
    let lastError: Error | null = null;
    let invalidMoveAttempts = 0;
    let failureRetries = 0;

    while (failureRetries <= this.MAX_FAILURE_RETRIES) {
      try {
        // Generate move with timeout
        const timeLimit = strategy.getTimeLimit?.() || this.DEFAULT_TIMEOUT;
        move = await this.generateMoveWithTimeout(strategy, gameState, aiPlayerId, timeLimit);

        // Validate move with retry logic for invalid moves
        while (invalidMoveAttempts < this.MAX_INVALID_MOVE_RETRIES) {
          const validation = plugin.validateMove(gameState, aiPlayerId, move);
          if (validation.valid) {
            // Apply the valid move
            const updatedState = plugin.applyMove(gameState, aiPlayerId, move);

            // Save updated state to repository
            await this.gameRepository.update(gameId, updatedState, gameState.version);

            return updatedState;
          }

          // Move is invalid, try again
          invalidMoveAttempts++;
          if (invalidMoveAttempts >= this.MAX_INVALID_MOVE_RETRIES) {
            throw new InvalidMoveError(
              `AI player ${aiPlayerId} generated ${this.MAX_INVALID_MOVE_RETRIES} invalid moves: ${validation.reason}`
            );
          }

          // Generate new move for retry
          move = await this.generateMoveWithTimeout(strategy, gameState, aiPlayerId, timeLimit);
        }
      } catch (error) {
        lastError = error as Error;

        // If it's a timeout or invalid move error, don't retry
        if (error instanceof AITimeoutError || error instanceof InvalidMoveError) {
          throw error;
        }

        // For other errors, retry once
        failureRetries++;
        if (failureRetries > this.MAX_FAILURE_RETRIES) {
          throw new AIMoveGenerationError(aiPlayerId, lastError);
        }

        // Reset invalid move attempts for retry
        invalidMoveAttempts = 0;
      }
    }

    // This should never be reached, but just in case
    throw new AIMoveGenerationError(aiPlayerId, lastError || undefined);
  }

  /**
   * Generate AI move with timeout handling
   * @private
   */
  private async generateMoveWithTimeout(
    strategy: AIStrategy,
    gameState: GameState,
    aiPlayerId: string,
    timeLimit: number
  ): Promise<Move> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new AITimeoutError(aiPlayerId, timeLimit));
      }, timeLimit);

      strategy
        .generateMove(gameState, aiPlayerId)
        .then((move) => {
          clearTimeout(timeout);
          resolve(move);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}
