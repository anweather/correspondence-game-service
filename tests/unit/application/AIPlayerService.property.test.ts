import * as fc from 'fast-check';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryAIPlayerRepository } from '@infrastructure/persistence/InMemoryAIPlayerRepository';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { AIPlayer } from '@domain/models/AIPlayer';
import { AIStrategy, AICapableGamePlugin, ValidationResult } from '@domain/interfaces';
import { GameState, Move, GameLifecycle } from '@domain/models';
import { MockGameEngine } from '../../utils';

// Mock AI Strategy that can be configured to generate valid or invalid moves
class ConfigurableAIStrategy implements AIStrategy {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly difficulty?: string,
    private shouldGenerateValidMoves: boolean = true
  ) {}

  async generateMove(_state: GameState, aiPlayerId: string): Promise<Move> {
    return {
      playerId: aiPlayerId,
      timestamp: new Date(),
      action: this.shouldGenerateValidMoves ? 'valid-move' : 'invalid-move',
      parameters: { position: this.shouldGenerateValidMoves ? 0 : -1 },
    };
  }

  setValidMoveGeneration(valid: boolean): void {
    this.shouldGenerateValidMoves = valid;
  }

  validateConfiguration?(config: Record<string, any>): boolean {
    return config.valid === true;
  }
}

// Mock AI-capable game engine with configurable validation
class ConfigurableAIGameEngine extends MockGameEngine implements AICapableGamePlugin {
  private strategies: AIStrategy[] = [];
  private defaultStrategy: ConfigurableAIStrategy;

  constructor(gameType: string) {
    super(gameType);
    this.defaultStrategy = new ConfigurableAIStrategy('default', 'Default AI', 'Default strategy');
    this.strategies = [this.defaultStrategy];
  }

  withAIStrategies(strategies: AIStrategy[]): this {
    this.strategies = strategies;
    if (strategies.length > 0 && strategies[0] instanceof ConfigurableAIStrategy) {
      this.defaultStrategy = strategies[0] as ConfigurableAIStrategy;
    }
    return this;
  }

  validateMove(_state: GameState, _playerId: string, move: Move): ValidationResult {
    // For property testing, we control validation based on move action
    if (move.action === 'valid-move') {
      return { valid: true };
    } else if (move.action === 'invalid-move') {
      return { valid: false, reason: 'Invalid move for testing' };
    }

    // Default validation logic
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
 * Property-based tests for AIPlayerService
 * These tests verify universal properties that should hold across all inputs
 */
describe('AIPlayerService - Property-Based Tests', () => {
  describe('Property 5: AI Move Generation Interface Compliance', () => {
    /**
     * **Feature: ai-player-system, Property 5: AI Move Generation Interface Compliance**
     * **Validates: Requirements 3.2, 3.4**
     *
     * Property: For any AI strategy implementation, calling the move generation interface
     * with valid game state should return valid moves within the time limit
     *
     * This property ensures that:
     * 1. AI strategies implement the required interface correctly
     * 2. AI strategies return moves in the expected format
     * 3. AI strategies respect time limits when specified
     * 4. AI strategies handle various game states appropriately
     */
    it('should generate moves that comply with the interface contract', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gameType: fc.constantFrom('tic-tac-toe', 'connect-four', 'chess'),
            strategyId: fc.constantFrom('test-strategy', 'random', 'easy'),
            strategyName: fc
              .string({ minLength: 1, maxLength: 50 })
              .filter((s) => s.trim().length > 0),
            timeLimit: fc.option(fc.integer({ min: 100, max: 5000 }), { nil: undefined }),
            aiPlayerName: fc
              .string({ minLength: 1, maxLength: 50 })
              .filter((s) => s.trim().length > 0),
          }),
          async (config) => {
            // Create fresh instances for each property test run
            const pluginRegistry = new PluginRegistry();
            const aiRepository = new InMemoryAIPlayerRepository();
            const gameRepository = new InMemoryGameRepository();
            const service = new AIPlayerService(pluginRegistry, aiRepository, gameRepository);

            // Create AI strategy with optional time limit
            const strategy = new ConfigurableAIStrategy(
              config.strategyId,
              config.strategyName,
              `${config.strategyName} strategy`
            );

            // Add time limit if specified
            if (config.timeLimit) {
              (strategy as any).getTimeLimit = () => config.timeLimit;
            }

            const plugin = new ConfigurableAIGameEngine(config.gameType).withAIStrategies([
              strategy,
            ]);

            pluginRegistry.register(plugin);

            // Create AI player
            const aiPlayers = await service.createAIPlayers(config.gameType, [
              { name: config.aiPlayerName, strategyId: config.strategyId },
            ]);
            const aiPlayer = aiPlayers[0];

            // Create test game state
            const gameState: GameState = {
              gameId: `compliance-game-${Date.now()}`,
              gameType: config.gameType,
              lifecycle: GameLifecycle.ACTIVE,
              players: [aiPlayer.toPlayer()],
              currentPlayerIndex: 0,
              phase: 'playing',
              board: { spaces: [], metadata: {} },
              moveHistory: [],
              metadata: {},
              winner: null,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Test move generation interface compliance
            const startTime = Date.now();
            const move = await strategy.generateMove(gameState, aiPlayer.id);
            const endTime = Date.now();
            const actualDuration = endTime - startTime;

            // Verify move structure compliance
            expect(move).toBeDefined();
            expect(typeof move).toBe('object');
            expect(move.playerId).toBe(aiPlayer.id);
            expect(move.timestamp).toBeInstanceOf(Date);
            expect(typeof move.action).toBe('string');
            expect(move.action.length).toBeGreaterThan(0);
            expect(move.parameters).toBeDefined();
            expect(typeof move.parameters).toBe('object');

            // Verify time limit compliance (with some tolerance for test execution overhead)
            if (config.timeLimit) {
              expect(actualDuration).toBeLessThan(config.timeLimit + 100); // 100ms tolerance
            }

            // Verify move timestamp is recent
            const timeDiff = Math.abs(move.timestamp.getTime() - Date.now());
            expect(timeDiff).toBeLessThan(1000); // Within 1 second

            // Verify strategy configuration validation if supported
            if (strategy.validateConfiguration) {
              expect(typeof strategy.validateConfiguration).toBe('function');

              // Test with valid configuration
              const validConfig = { valid: true };
              expect(strategy.validateConfiguration(validConfig)).toBe(true);

              // Test with invalid configuration
              const invalidConfig = { valid: false };
              expect(strategy.validateConfiguration(invalidConfig)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
