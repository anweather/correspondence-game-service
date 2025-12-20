import * as fc from 'fast-check';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryAIPlayerRepository } from '@infrastructure/persistence/InMemoryAIPlayerRepository';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { AIPlayer } from '@domain/models/AIPlayer';
import { AIStrategy, AICapableGamePlugin, ValidationResult } from '@domain/interfaces';
import { GameState, Move, GameLifecycle } from '@domain/models';
import { Logger, LogContext } from '@infrastructure/logging/Logger';
import { MockGameEngine } from '../../utils';

// Mock logger that captures log entries for verification
class MockLogger extends Logger {
  public logEntries: Array<{
    level: string;
    message: string;
    context?: LogContext;
  }> = [];

  constructor() {
    super('debug', 'json');
  }

  debug(message: string, context?: LogContext): void {
    this.logEntries.push({ level: 'debug', message, context });
  }

  info(message: string, context?: LogContext): void {
    this.logEntries.push({ level: 'info', message, context });
  }

  warn(message: string, context?: LogContext): void {
    this.logEntries.push({ level: 'warn', message, context });
  }

  error(message: string, context?: LogContext): void {
    this.logEntries.push({ level: 'error', message, context });
  }

  clearLogs(): void {
    this.logEntries = [];
  }

  getErrorLogs(): Array<{ level: string; message: string; context?: LogContext }> {
    return this.logEntries.filter((entry) => entry.level === 'error');
  }

  getWarningLogs(): Array<{ level: string; message: string; context?: LogContext }> {
    return this.logEntries.filter((entry) => entry.level === 'warn');
  }
}

// Failing AI Strategy for testing error scenarios
class FailingAIStrategy implements AIStrategy {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly difficulty?: string,
    private failureMode: 'error' | 'invalid-moves' = 'error'
  ) {}

  async generateMove(_state: GameState, aiPlayerId: string): Promise<Move> {
    switch (this.failureMode) {
      case 'error':
        throw new Error('Simulated AI strategy failure');

      case 'invalid-moves':
        return this.createMove(aiPlayerId, 'invalid-move');

      default:
        return this.createMove(aiPlayerId, 'valid-move');
    }
  }

  private createMove(aiPlayerId: string, action: string): Move {
    return {
      playerId: aiPlayerId,
      timestamp: new Date(),
      action,
      parameters: { position: action === 'invalid-move' ? -1 : 0 },
    };
  }

  setFailureMode(mode: 'error' | 'invalid-moves'): void {
    this.failureMode = mode;
  }

  getTimeLimit(): number {
    return 500; // Short timeout for testing
  }
}

// Mock AI-capable game engine for error testing
class ErrorTestingAIGameEngine extends MockGameEngine implements AICapableGamePlugin {
  private strategies: AIStrategy[] = [];
  private defaultStrategy: FailingAIStrategy;

  constructor(gameType: string) {
    super(gameType);
    this.defaultStrategy = new FailingAIStrategy('failing', 'Failing AI', 'Strategy that fails');
    this.strategies = [this.defaultStrategy];
  }

  withAIStrategies(strategies: AIStrategy[]): this {
    this.strategies = strategies;
    if (strategies.length > 0 && strategies[0] instanceof FailingAIStrategy) {
      this.defaultStrategy = strategies[0] as FailingAIStrategy;
    }
    return this;
  }

  validateMove(_state: GameState, _playerId: string, move: Move): ValidationResult {
    if (move.action === 'invalid-move') {
      return { valid: false, reason: 'Move is intentionally invalid for testing' };
    }
    return { valid: true };
  }

  getAIStrategies(): AIStrategy[] {
    return this.strategies;
  }

  getDefaultAIStrategy(): AIStrategy {
    return this.defaultStrategy;
  }

  createAIPlayer(name: string, strategyId?: string, difficulty?: string): AIPlayer {
    const strategy = strategyId || this.defaultStrategy.id;
    return new AIPlayer(
      `ai-${Date.now()}-${Math.random()}`,
      name,
      this.getGameType(),
      strategy,
      difficulty
    );
  }

  supportsAI(): boolean {
    return true;
  }
}

/**
 * Property-based tests for AI Error Logging Context
 */
describe('AIPlayerService - AI Error Logging Context Property Tests', () => {
  describe('Property 11: AI Error Logging Context', () => {
    /**
     * **Feature: ai-player-system, Property 11: AI Error Logging Context**
     * **Validates: Requirements 7.5**
     *
     * Property: For any AI error that occurs, the logged error should include
     * sufficient debugging context including game state and AI configuration
     *
     * This property ensures that:
     * 1. All AI errors are logged with structured context
     * 2. Game state information is included in error logs
     * 3. AI player configuration is included in error logs
     * 4. Performance metrics are included where applicable
     * 5. Error context is sanitized to avoid sensitive data leakage
     */
    it('should include comprehensive context in all AI error logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gameType: fc.constantFrom('tic-tac-toe'),
            aiPlayerName: fc.constant('TestAI'),
            strategyId: fc.constant('failing-strategy'),
            difficulty: fc.option(fc.constantFrom('easy', 'medium'), { nil: undefined }),
            failureMode: fc.constantFrom('error', 'invalid-moves'),
            gameStateVariant: fc.record({
              playerCount: fc.constant(1),
              moveCount: fc.constant(0),
              currentPlayerIndex: fc.constant(0),
            }),
          }),
          async (config) => {
            // Create mock logger to capture log entries
            const mockLogger = new MockLogger();
            mockLogger.clearLogs();

            // Create fresh instances for each property test run
            const pluginRegistry = new PluginRegistry();
            const aiRepository = new InMemoryAIPlayerRepository();
            const gameRepository = new InMemoryGameRepository();
            const service = new AIPlayerService(
              pluginRegistry,
              aiRepository,
              gameRepository,
              mockLogger
            );

            // Create failing AI strategy
            const strategy = new FailingAIStrategy(
              config.strategyId,
              `${config.strategyId} strategy`,
              'Strategy designed to fail for testing',
              config.difficulty,
              config.failureMode
            );

            const plugin = new ErrorTestingAIGameEngine(config.gameType).withAIStrategies([
              strategy,
            ]);
            pluginRegistry.register(plugin);

            // Create AI player
            const aiPlayers = await service.createAIPlayers(config.gameType, [
              {
                name: config.aiPlayerName,
                strategyId: config.strategyId,
                difficulty: config.difficulty,
                configuration: { testMode: true, failureMode: config.failureMode },
              },
            ]);
            const aiPlayer = aiPlayers[0];

            // Create test game state with variable complexity
            const players = Array.from({ length: config.gameStateVariant.playerCount }, (_, i) => ({
              id: i === 0 ? aiPlayer.id : `player-${i}`,
              name: i === 0 ? aiPlayer.name : `Player ${i}`,
              joinedAt: new Date(),
              metadata: i === 0 ? { isAI: true, strategyId: config.strategyId } : {},
            }));

            const gameState: GameState = {
              gameId: `error-test-game-${Date.now()}`,
              gameType: config.gameType,
              lifecycle: GameLifecycle.ACTIVE,
              players,
              currentPlayerIndex: Math.min(
                config.gameStateVariant.currentPlayerIndex,
                players.length - 1
              ),
              phase: 'playing',
              board: { spaces: [], metadata: { complexity: 'test' } },
              moveHistory: Array.from({ length: config.gameStateVariant.moveCount }, (_, i) => ({
                playerId: players[i % players.length].id,
                timestamp: new Date(Date.now() - (config.gameStateVariant.moveCount - i) * 1000),
                action: `move-${i}`,
                parameters: { position: i },
              })),
              metadata: { testRun: true, variant: config.gameStateVariant },
              winner: null,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Save game state to repository
            await gameRepository.save(gameState);

            // Clear any logs from setup
            mockLogger.clearLogs();

            // Attempt to process AI turn (this should fail and generate error logs)
            let errorThrown = false;
            try {
              await service.processAITurn(gameState.gameId, aiPlayer.id);
            } catch (error) {
              errorThrown = true;
              // Expected to fail - we're testing the error logging
            }

            // Verify that an error was thrown (property should always fail in our test scenarios)
            expect(errorThrown).toBe(true);

            // Get all error logs
            const errorLogs = mockLogger.getErrorLogs();
            expect(errorLogs.length).toBeGreaterThan(0);

            // Verify each error log contains required context
            for (const errorLog of errorLogs) {
              expect(errorLog.context).toBeDefined();
              const context = errorLog.context!;

              // Verify operation context is present
              expect(context.operation || context.gameId || context.aiPlayerId).toBeDefined();

              // Check for AI-related error logs (not all logs may be AI-specific)
              if (context.aiPlayerId || context.operation === 'processAITurn') {
                // Verify AI player context
                if (context.aiPlayer) {
                  expect(context.aiPlayer.id).toBeDefined();
                  expect(context.aiPlayer.name).toBeDefined();
                  expect(context.aiPlayer.gameType).toBe(config.gameType);
                  expect(context.aiPlayer.strategyId).toBeDefined();

                  // Verify sensitive data is sanitized
                  expect(context.aiPlayer.hasConfiguration).toBeDefined();
                  expect(context.aiPlayer.configurationKeys).toBeDefined();
                  // Configuration details should not be directly exposed
                  expect(context.aiPlayer.configuration).toBeUndefined();
                }

                // Verify game state context
                if (context.gameState) {
                  expect(context.gameState.id).toBeDefined();
                  expect(context.gameState.gameType).toBe(config.gameType);
                  expect(context.gameState.lifecycle).toBeDefined();
                  expect(context.gameState.playerCount).toBe(config.gameStateVariant.playerCount);
                  expect(context.gameState.moveCount).toBe(config.gameStateVariant.moveCount);
                  expect(context.gameState.players).toBeDefined();
                  expect(Array.isArray(context.gameState.players)).toBe(true);

                  // Verify players array contains sanitized player info
                  for (const player of context.gameState.players) {
                    expect(player.id).toBeDefined();
                    expect(player.name).toBeDefined();
                    expect(typeof player.isAI).toBe('boolean');
                  }

                  // Verify sensitive/large data is excluded
                  expect(context.gameState.board).toBeUndefined(); // Large board data excluded
                  expect(context.gameState.moveHistory).toBeUndefined(); // Full history excluded
                }

                // Verify performance metrics for timeout/generation errors
                if (
                  context.performance ||
                  errorLog.message.includes('timeout') ||
                  errorLog.message.includes('generation')
                ) {
                  if (context.performance) {
                    expect(typeof context.performance.totalTimeMs).toBe('number');
                    expect(context.performance.totalTimeMs).toBeGreaterThanOrEqual(0);
                  }
                }

                // Verify error details
                expect(context.error || errorLog.message).toBeDefined();
                if (context.errorType) {
                  expect(typeof context.errorType).toBe('string');
                  expect(context.errorType.length).toBeGreaterThan(0);
                }
              }
            }

            // Verify specific error types have appropriate context
            const timeoutErrors = errorLogs.filter(
              (log) =>
                log.message.includes('timeout') || log.context?.errorType === 'AITimeoutError'
            );
            const invalidMoveErrors = errorLogs.filter(
              (log) =>
                log.message.includes('invalid move') ||
                log.context?.errorType === 'InvalidMoveError'
            );

            // For timeout errors, verify time-related context
            for (const timeoutError of timeoutErrors) {
              if (timeoutError.context?.timeLimit !== undefined) {
                expect(typeof timeoutError.context.timeLimit).toBe('number');
                expect(timeoutError.context.timeLimit).toBeGreaterThan(0);
              }
            }

            // For invalid move errors, verify move validation context
            for (const invalidMoveError of invalidMoveErrors) {
              if (invalidMoveError.context?.invalidMoveAttempts !== undefined) {
                expect(typeof invalidMoveError.context.invalidMoveAttempts).toBe('number');
                expect(invalidMoveError.context.invalidMoveAttempts).toBeGreaterThanOrEqual(0);
              }
              if (invalidMoveError.context?.maxRetries !== undefined) {
                expect(typeof invalidMoveError.context.maxRetries).toBe('number');
                expect(invalidMoveError.context.maxRetries).toBeGreaterThan(0);
              }
            }

            // Verify that at least one error log contains comprehensive debugging context
            const comprehensiveErrorLogs = errorLogs.filter(
              (log) => log.context?.aiPlayer && log.context?.gameState && log.context?.error
            );
            expect(comprehensiveErrorLogs.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20, timeout: 10000 }
      );
    }, 15000);
  });
});
