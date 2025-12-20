import * as fc from 'fast-check';
import { PluginRegistry } from '@application/PluginRegistry';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { InMemoryAIPlayerRepository } from '@infrastructure/persistence/InMemoryAIPlayerRepository';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { RandomAIStrategy } from '@application/ai/RandomAIStrategy';
import { AIStrategy, AICapableGamePlugin, ValidationResult } from '@domain/interfaces';
import { GameState, Move } from '@domain/models';
import { AIPlayer } from '@domain/models/AIPlayer';
import { MockGameEngine } from '../../utils';

// Mock AI-capable game engine for testing
class TestAIGameEngine extends MockGameEngine implements AICapableGamePlugin {
  private strategies: AIStrategy[] = [];
  private defaultStrategy: AIStrategy;

  constructor(gameType: string, strategies: AIStrategy[] = []) {
    super(gameType);

    // Always include a fallback random strategy
    const randomStrategy = new RandomAIStrategy(this);
    this.strategies = [...strategies, randomStrategy];
    this.defaultStrategy = this.strategies[0];
  }

  validateMove(_state: GameState, _playerId: string, _move: Move): ValidationResult {
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

// Simple test AI strategy
class TestAIStrategy implements AIStrategy {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly difficulty?: string
  ) {}

  async generateMove(_state: GameState, aiPlayerId: string): Promise<Move> {
    return {
      playerId: aiPlayerId,
      timestamp: new Date(),
      action: 'test-move',
      parameters: { test: true },
    };
  }

  validateConfiguration?(_config: Record<string, any>): boolean {
    return true;
  }
}

/**
 * Property-based tests for AI Strategy Availability
 */
describe('AI Strategy Availability - Property-Based Tests', () => {
  describe('Property 4: AI Strategy Availability', () => {
    /**
     * **Feature: ai-player-system, Property 4: AI Strategy Availability**
     * **Validates: Requirements 3.1, 3.5**
     *
     * Property: For any registered game type, the game plugin should provide at least one AI strategy,
     * with a default strategy always available
     *
     * This property ensures that:
     * 1. Every registered game type has at least one AI strategy available
     * 2. A default strategy is always accessible
     * 3. The AIPlayerService can retrieve strategies for any game type
     * 4. Fallback random strategy is available when no custom strategies exist
     */
    it('should always provide at least one AI strategy with a default available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gameType: fc.constantFrom('tic-tac-toe', 'connect-four', 'chess', 'checkers'),
            customStrategies: fc
              .array(
                fc.record({
                  id: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
                  name: fc
                    .string({ minLength: 1, maxLength: 50 })
                    .filter((s) => s.trim().length > 0),
                  description: fc
                    .string({ minLength: 1, maxLength: 100 })
                    .filter((s) => s.trim().length > 0),
                  difficulty: fc.option(fc.constantFrom('easy', 'medium', 'hard'), {
                    nil: undefined,
                  }),
                }),
                { minLength: 0, maxLength: 3 }
              )
              .map((strategies) => {
                // Ensure unique IDs to avoid conflicts
                const uniqueStrategies = [];
                const seenIds = new Set();
                for (const strategy of strategies) {
                  if (!seenIds.has(strategy.id)) {
                    seenIds.add(strategy.id);
                    uniqueStrategies.push(strategy);
                  }
                }
                return uniqueStrategies;
              }),
          }),
          async (config) => {
            // Create fresh instances for each property test run
            const pluginRegistry = new PluginRegistry();
            const aiRepository = new InMemoryAIPlayerRepository();
            const gameRepository = new InMemoryGameRepository();
            const service = new AIPlayerService(pluginRegistry, aiRepository, gameRepository);

            // Create custom AI strategies from the generated config
            const customStrategies = config.customStrategies.map(
              (strategyConfig) =>
                new TestAIStrategy(
                  strategyConfig.id,
                  strategyConfig.name,
                  strategyConfig.description,
                  strategyConfig.difficulty
                )
            );

            // Create and register AI-capable game plugin
            const plugin = new TestAIGameEngine(config.gameType, customStrategies);
            pluginRegistry.register(plugin);

            // Test that strategies are available
            const availableStrategies = service.getAvailableStrategies(config.gameType);

            // Property 1: At least one strategy must be available
            expect(availableStrategies).toBeDefined();
            expect(Array.isArray(availableStrategies)).toBe(true);
            expect(availableStrategies.length).toBeGreaterThanOrEqual(1);

            // Property 2: Default strategy must be available
            const defaultStrategy = plugin.getDefaultAIStrategy();
            expect(defaultStrategy).toBeDefined();
            expect(typeof defaultStrategy.id).toBe('string');
            expect(defaultStrategy.id.length).toBeGreaterThan(0);
            expect(typeof defaultStrategy.name).toBe('string');
            expect(defaultStrategy.name.length).toBeGreaterThan(0);

            // Property 3: Default strategy must be in available strategies
            const defaultStrategyInList = availableStrategies.find(
              (s) => s.id === defaultStrategy.id
            );
            expect(defaultStrategyInList).toBeDefined();

            // Property 4: All strategies must have required properties
            for (const strategy of availableStrategies) {
              expect(strategy.id).toBeDefined();
              expect(typeof strategy.id).toBe('string');
              expect(strategy.id.length).toBeGreaterThan(0);

              expect(strategy.name).toBeDefined();
              expect(typeof strategy.name).toBe('string');
              expect(strategy.name.length).toBeGreaterThan(0);

              expect(strategy.description).toBeDefined();
              expect(typeof strategy.description).toBe('string');
              expect(strategy.description.length).toBeGreaterThan(0);

              expect(typeof strategy.generateMove).toBe('function');
            }

            // Property 5: Random fallback strategy should always be available
            // (This ensures Requirements 3.5 - fallback when no custom AI is implemented)
            const randomStrategy = availableStrategies.find((s) => s.id === 'random');
            expect(randomStrategy).toBeDefined();
            expect(randomStrategy?.name).toBe('Random AI');
            expect(randomStrategy?.difficulty).toBe('easy');

            // Property 6: Custom strategies should be preserved
            for (const customStrategy of customStrategies) {
              const foundStrategy = availableStrategies.find((s) => s.id === customStrategy.id);
              expect(foundStrategy).toBeDefined();
              expect(foundStrategy?.name).toBe(customStrategy.name);
              expect(foundStrategy?.description).toBe(customStrategy.description);
              expect(foundStrategy?.difficulty).toBe(customStrategy.difficulty);
            }

            // Property 7: Should be able to create AI players with any available strategy
            for (const strategy of availableStrategies) {
              const aiPlayers = await service.createAIPlayers(config.gameType, [
                { name: `Test AI for ${strategy.id}`, strategyId: strategy.id },
              ]);

              expect(aiPlayers).toBeDefined();
              expect(aiPlayers.length).toBe(1);
              expect(aiPlayers[0].strategyId).toBe(strategy.id);
              expect(aiPlayers[0].gameType).toBe(config.gameType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test that unregistered game types handle strategy requests gracefully
     */
    it('should handle requests for unregistered game types gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          async (unregisteredGameType) => {
            // Create fresh instances
            const pluginRegistry = new PluginRegistry();
            const aiRepository = new InMemoryAIPlayerRepository();
            const gameRepository = new InMemoryGameRepository();
            const service = new AIPlayerService(pluginRegistry, aiRepository, gameRepository);

            // Don't register any plugins for this game type

            // Test that requesting strategies for unregistered game type throws an error
            expect(() => service.getAvailableStrategies(unregisteredGameType)).toThrow(
              `Game type "${unregisteredGameType}" is not supported`
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
