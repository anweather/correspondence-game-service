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
import { Logger } from '@infrastructure/logging/Logger';

/**
 * Service for managing AI players and their moves
 * Handles AI player creation, move generation, and strategy management
 */
export class AIPlayerService {
  private readonly DEFAULT_TIMEOUT = 1000; // 1 second default timeout
  private readonly MAX_INVALID_MOVE_RETRIES = 3;
  private readonly MAX_FAILURE_RETRIES = 1;
  private readonly logger: Logger;

  constructor(
    private pluginRegistry: PluginRegistry,
    private aiRepository: IAIPlayerRepository,
    private gameRepository: GameRepository,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('info', 'json');
  }

  /**
   * Create AI players for a game
   * @param gameType Type of game
   * @param aiPlayerConfigs Configuration for each AI player
   * @returns Created AI players
   * @throws AIStrategyNotFoundError if strategy not found
   * @throws InvalidAIConfigurationError if configuration is invalid
   */
  async createAIPlayers(gameType: string, aiPlayerConfigs: AIPlayerConfig[]): Promise<AIPlayer[]> {
    const aiLogger = this.logger.child({
      operation: 'createAIPlayers',
      gameType,
      playerCount: aiPlayerConfigs.length,
    });

    aiLogger.info('Starting AI player creation', {
      configurations: aiPlayerConfigs.map((config) => ({
        name: config.name,
        strategyId: config.strategyId,
        difficulty: config.difficulty,
        hasConfiguration: !!config.configuration,
      })),
    });

    const plugin = this.pluginRegistry.get(gameType);
    if (!plugin) {
      const error = new Error(`Game type "${gameType}" is not supported`);
      aiLogger.error('Game type not supported', {
        error: error.message,
        gameType,
      });
      throw error;
    }

    // Check if plugin supports AI
    const aiCapablePlugin = plugin as AICapableGamePlugin;
    if (!aiCapablePlugin.supportsAI || !aiCapablePlugin.supportsAI()) {
      const error = new InvalidAIConfigurationError(
        `Game type "${gameType}" does not support AI players`
      );
      aiLogger.error('Game type does not support AI', {
        error: error.message,
        code: error.code,
        gameType,
      });
      throw error;
    }

    const createdPlayers: AIPlayer[] = [];

    for (const config of aiPlayerConfigs) {
      try {
        // Use default strategy if none specified
        const strategyId = config.strategyId || aiCapablePlugin.getDefaultAIStrategy().id;

        // Validate strategy exists
        const availableStrategies = aiCapablePlugin.getAIStrategies();
        const strategy = availableStrategies.find((s) => s.id === strategyId);
        if (!strategy) {
          const error = new AIStrategyNotFoundError(gameType, strategyId);
          aiLogger.error('AI strategy not found', {
            error: error.message,
            code: error.code,
            gameType,
            strategyId,
            availableStrategies: availableStrategies.map((s) => s.id),
            playerConfig: {
              name: config.name,
              difficulty: config.difficulty,
            },
          });
          throw error;
        }

        // Validate configuration if strategy supports it
        if (strategy.validateConfiguration && config.configuration) {
          if (!strategy.validateConfiguration(config.configuration)) {
            const error = new InvalidAIConfigurationError(
              `Invalid configuration for strategy "${strategyId}"`,
              config.configuration
            );
            aiLogger.error('Invalid AI configuration', {
              error: error.message,
              code: error.code,
              strategyId,
              playerConfig: {
                name: config.name,
                difficulty: config.difficulty,
                configurationKeys: Object.keys(config.configuration),
              },
            });
            throw error;
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

        aiLogger.info('AI player created successfully', {
          aiPlayer: this.sanitizeAIPlayer(aiPlayer),
          strategy: {
            id: strategy.id,
            name: strategy.name,
            difficulty: strategy.difficulty,
          },
        });

        createdPlayers.push(aiPlayer);
      } catch (error) {
        aiLogger.error('Failed to create AI player', {
          error: (error as Error).message,
          errorType: (error as Error).constructor.name,
          playerConfig: {
            name: config.name,
            strategyId: config.strategyId,
            difficulty: config.difficulty,
            hasConfiguration: !!config.configuration,
          },
        });
        throw error;
      }
    }

    aiLogger.info('AI player creation completed', {
      createdCount: createdPlayers.length,
      requestedCount: aiPlayerConfigs.length,
      players: createdPlayers.map((p) => this.sanitizeAIPlayer(p)),
    });

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
    const startTime = Date.now();
    const aiLogger = this.logger.child({
      operation: 'processAITurn',
      gameId,
      aiPlayerId,
    });

    aiLogger.info('Starting AI turn processing');

    try {
      // Get current game state
      const gameState = await this.gameRepository.findById(gameId);
      if (!gameState) {
        const error = new GameNotFoundError(gameId);
        aiLogger.error('Game not found', {
          error: error.message,
          code: error.code,
        });
        throw error;
      }

      // Get AI player configuration
      const aiPlayer = await this.aiRepository.findById(aiPlayerId);
      if (!aiPlayer) {
        const error = new Error(`AI player ${aiPlayerId} not found`);
        aiLogger.error('AI player not found', {
          error: error.message,
          gameState: this.sanitizeGameState(gameState),
        });
        throw error;
      }

      // Log AI configuration context
      aiLogger.info('AI player configuration loaded', {
        aiPlayer: {
          id: aiPlayer.id,
          name: aiPlayer.name,
          gameType: aiPlayer.gameType,
          strategyId: aiPlayer.strategyId,
          difficulty: aiPlayer.difficulty,
          configuration: aiPlayer.configuration,
        },
        gameState: this.sanitizeGameState(gameState),
      });

      // Get game plugin and AI strategy
      const plugin = this.pluginRegistry.get(gameState.gameType);
      if (!plugin) {
        const error = new Error(`Game type "${gameState.gameType}" is not supported`);
        aiLogger.error('Game plugin not found', {
          error: error.message,
          gameType: gameState.gameType,
          aiPlayer: this.sanitizeAIPlayer(aiPlayer),
        });
        throw error;
      }

      const aiCapablePlugin = plugin as AICapableGamePlugin;
      if (!aiCapablePlugin.supportsAI || !aiCapablePlugin.supportsAI()) {
        const error = new Error(`Game type "${gameState.gameType}" does not support AI players`);
        aiLogger.error('Game type does not support AI', {
          error: error.message,
          gameType: gameState.gameType,
          aiPlayer: this.sanitizeAIPlayer(aiPlayer),
        });
        throw error;
      }

      const strategies = aiCapablePlugin.getAIStrategies();
      const strategy = strategies.find((s) => s.id === aiPlayer.strategyId);
      if (!strategy) {
        const error = new AIStrategyNotFoundError(gameState.gameType, aiPlayer.strategyId);
        aiLogger.error('AI strategy not found', {
          error: error.message,
          code: error.code,
          gameType: gameState.gameType,
          strategyId: aiPlayer.strategyId,
          availableStrategies: strategies.map((s) => s.id),
          aiPlayer: this.sanitizeAIPlayer(aiPlayer),
          gameState: this.sanitizeGameState(gameState),
        });
        throw error;
      }

      // Generate AI move with retry logic
      let move: Move;
      let lastError: Error | null = null;
      let invalidMoveAttempts = 0;
      let failureRetries = 0;
      const moveGenerationStartTime = Date.now();

      aiLogger.info('Starting AI move generation', {
        strategy: {
          id: strategy.id,
          name: strategy.name,
          difficulty: strategy.difficulty,
        },
        timeLimit: strategy.getTimeLimit?.() || this.DEFAULT_TIMEOUT,
      });

      while (failureRetries <= this.MAX_FAILURE_RETRIES) {
        try {
          // Generate move with timeout
          const timeLimit = strategy.getTimeLimit?.() || this.DEFAULT_TIMEOUT;
          const moveAttemptStartTime = Date.now();

          move = await this.generateMoveWithTimeout(strategy, gameState, aiPlayerId, timeLimit);

          // Ensure the move has the correct playerId set
          move = {
            ...move,
            playerId: aiPlayerId,
          };

          const moveGenerationTime = Date.now() - moveAttemptStartTime;
          aiLogger.info('AI move generated', {
            move,
            generationTimeMs: moveGenerationTime,
            attempt: failureRetries + 1,
            invalidMoveAttempts,
          });

          // Validate move with retry logic for invalid moves
          while (invalidMoveAttempts < this.MAX_INVALID_MOVE_RETRIES) {
            const validation = plugin.validateMove(gameState, aiPlayerId, move);
            if (validation.valid) {
              // Apply the valid move
              const updatedState = plugin.applyMove(gameState, aiPlayerId, move);

              // Save updated state to repository
              await this.gameRepository.update(gameId, updatedState, gameState.version);

              const totalTime = Date.now() - startTime;
              const moveGenerationTotalTime = Date.now() - moveGenerationStartTime;

              aiLogger.info('AI turn completed successfully', {
                move,
                totalTimeMs: totalTime,
                moveGenerationTimeMs: moveGenerationTotalTime,
                totalAttempts: failureRetries + 1,
                invalidMoveRetries: invalidMoveAttempts,
                performance: {
                  withinTimeLimit: moveGenerationTotalTime <= timeLimit,
                  efficiency: moveGenerationTotalTime / timeLimit,
                },
              });

              return updatedState;
            }

            // Move is invalid, log and try again
            invalidMoveAttempts++;
            aiLogger.warn('AI generated invalid move', {
              move,
              validationReason: validation.reason,
              invalidMoveAttempt: invalidMoveAttempts,
              maxRetries: this.MAX_INVALID_MOVE_RETRIES,
              aiPlayer: this.sanitizeAIPlayer(aiPlayer),
              gameState: this.sanitizeGameState(gameState),
            });

            if (invalidMoveAttempts >= this.MAX_INVALID_MOVE_RETRIES) {
              const error = new InvalidMoveError(
                `AI player ${aiPlayerId} generated ${this.MAX_INVALID_MOVE_RETRIES} invalid moves: ${validation.reason}`
              );
              aiLogger.error('AI exceeded invalid move retry limit', {
                error: error.message,
                code: error.code,
                invalidMoveAttempts,
                maxRetries: this.MAX_INVALID_MOVE_RETRIES,
                lastMove: move,
                lastValidationReason: validation.reason,
                aiPlayer: this.sanitizeAIPlayer(aiPlayer),
                gameState: this.sanitizeGameState(gameState),
                performance: {
                  totalTimeMs: Date.now() - startTime,
                  moveGenerationTimeMs: Date.now() - moveGenerationStartTime,
                },
              });
              throw error;
            }

            // Generate new move for retry
            const retryStartTime = Date.now();
            move = await this.generateMoveWithTimeout(strategy, gameState, aiPlayerId, timeLimit);

            // Ensure the retry move also has the correct playerId set
            move = {
              ...move,
              playerId: aiPlayerId,
            };

            const retryTime = Date.now() - retryStartTime;

            aiLogger.info('AI move regenerated for invalid move retry', {
              move,
              retryTimeMs: retryTime,
              invalidMoveAttempt: invalidMoveAttempts,
            });
          }
        } catch (error) {
          lastError = error as Error;
          failureRetries++;

          aiLogger.error('AI move generation failed', {
            error: lastError.message,
            errorType: lastError.constructor.name,
            failureRetry: failureRetries,
            maxRetries: this.MAX_FAILURE_RETRIES,
            aiPlayer: this.sanitizeAIPlayer(aiPlayer),
            gameState: this.sanitizeGameState(gameState),
            performance: {
              totalTimeMs: Date.now() - startTime,
              moveGenerationTimeMs: Date.now() - moveGenerationStartTime,
            },
          });

          // If it's a timeout or invalid move error, don't retry
          if (error instanceof AITimeoutError || error instanceof InvalidMoveError) {
            aiLogger.error('AI error is not retryable', {
              error: lastError.message,
              errorType: lastError.constructor.name,
              aiPlayer: this.sanitizeAIPlayer(aiPlayer),
              gameState: this.sanitizeGameState(gameState),
            });
            throw error;
          }

          // For other errors, retry once
          if (failureRetries > this.MAX_FAILURE_RETRIES) {
            const finalError = new AIMoveGenerationError(aiPlayerId, lastError);
            aiLogger.error('AI exceeded failure retry limit', {
              error: finalError.message,
              code: finalError.code,
              originalError: lastError.message,
              originalErrorType: lastError.constructor.name,
              failureRetries,
              maxRetries: this.MAX_FAILURE_RETRIES,
              aiPlayer: this.sanitizeAIPlayer(aiPlayer),
              gameState: this.sanitizeGameState(gameState),
              performance: {
                totalTimeMs: Date.now() - startTime,
                moveGenerationTimeMs: Date.now() - moveGenerationStartTime,
              },
            });
            throw finalError;
          }

          // Reset invalid move attempts for retry
          invalidMoveAttempts = 0;
          aiLogger.info('Retrying AI move generation after failure', {
            failureRetry: failureRetries,
            maxRetries: this.MAX_FAILURE_RETRIES,
          });
        }
      }

      // This should never be reached, but just in case
      const finalError = new AIMoveGenerationError(aiPlayerId, lastError || undefined);
      aiLogger.error('AI turn processing failed unexpectedly', {
        error: finalError.message,
        code: finalError.code,
        aiPlayer: this.sanitizeAIPlayer(aiPlayer),
        gameState: this.sanitizeGameState(gameState),
        performance: {
          totalTimeMs: Date.now() - startTime,
        },
      });
      throw finalError;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      aiLogger.error('AI turn processing failed', {
        error: (error as Error).message,
        errorType: (error as Error).constructor.name,
        performance: {
          totalTimeMs: totalTime,
        },
      });
      throw error;
    }
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
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const actualTime = Date.now() - startTime;
        this.logger.error('AI move generation timeout', {
          aiPlayerId,
          timeLimit,
          actualTimeMs: actualTime,
          strategyId: strategy.id,
          gameState: this.sanitizeGameState(gameState),
        });
        reject(new AITimeoutError(aiPlayerId, timeLimit));
      }, timeLimit);

      strategy
        .generateMove(gameState, aiPlayerId)
        .then((move) => {
          clearTimeout(timeout);
          const actualTime = Date.now() - startTime;
          this.logger.debug('AI move generation completed', {
            aiPlayerId,
            timeLimit,
            actualTimeMs: actualTime,
            strategyId: strategy.id,
            move,
            performance: {
              withinTimeLimit: actualTime <= timeLimit,
              efficiency: actualTime / timeLimit,
            },
          });
          resolve(move);
        })
        .catch((error) => {
          clearTimeout(timeout);
          const actualTime = Date.now() - startTime;
          this.logger.error('AI move generation error', {
            aiPlayerId,
            timeLimit,
            actualTimeMs: actualTime,
            strategyId: strategy.id,
            error: error.message,
            errorType: error.constructor.name,
            gameState: this.sanitizeGameState(gameState),
          });
          reject(error);
        });
    });
  }

  /**
   * Sanitize game state for logging (remove sensitive or large data)
   * @private
   */
  private sanitizeGameState(gameState: GameState): Record<string, any> {
    return {
      id: gameState.gameId,
      gameType: gameState.gameType,
      lifecycle: gameState.lifecycle,
      currentPlayerIndex: gameState.currentPlayerIndex,
      playerCount: gameState.players.length,
      players: gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isAI: p.metadata?.isAI || false,
      })),
      moveCount: gameState.moveHistory.length,
      version: gameState.version,
      createdAt: gameState.createdAt,
      // Exclude potentially large board data and full move history
    };
  }

  /**
   * Sanitize AI player data for logging (remove sensitive configuration)
   * @private
   */
  private sanitizeAIPlayer(aiPlayer: AIPlayer): Record<string, any> {
    return {
      id: aiPlayer.id,
      name: aiPlayer.name,
      gameType: aiPlayer.gameType,
      strategyId: aiPlayer.strategyId,
      difficulty: aiPlayer.difficulty,
      // Exclude potentially sensitive configuration details
      hasConfiguration: !!aiPlayer.configuration,
      configurationKeys: aiPlayer.configuration ? Object.keys(aiPlayer.configuration) : [],
    };
  }
}
