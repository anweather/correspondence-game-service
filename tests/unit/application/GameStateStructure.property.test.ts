import * as fc from 'fast-check';
import { GameManagerService } from '@application/services/GameManagerService';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { InMemoryAIPlayerRepository } from '@infrastructure/persistence/InMemoryAIPlayerRepository';
import { GameState, GameLifecycle, Player } from '@domain/models';
import { AIPlayer } from '@domain/models/AIPlayer';
import { AIStrategy, AICapableGamePlugin, ValidationResult } from '@domain/interfaces';
import { MockGameEngine, createPlayer } from '../../utils';

// Mock AI Strategy for property testing
class PropertyTestAIStrategy implements AIStrategy {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly difficulty?: string
  ) {}

  async generateMove(_state: GameState, aiPlayerId: string): Promise<any> {
    return {
      playerId: aiPlayerId,
      timestamp: new Date(),
      action: 'test-move',
      parameters: { test: true },
    };
  }
}

// Mock AI-capable game engine for property testing
class PropertyTestAIGameEngine extends MockGameEngine implements AICapableGamePlugin {
  private strategies: AIStrategy[] = [];
  private defaultStrategy: PropertyTestAIStrategy;

  constructor(gameType: string) {
    super(gameType);
    this.defaultStrategy = new PropertyTestAIStrategy(
      'default-ai',
      'Default AI',
      'Default AI strategy'
    );
    this.strategies = [this.defaultStrategy];
  }

  validateMove(_state: GameState, _playerId: string, _move: any): ValidationResult {
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
 * Property-based tests for Game State Structure Consistency
 * These tests verify universal properties that should hold across all game configurations
 */
describe('Game State Structure Consistency - Property-Based Tests', () => {
  describe('Property 6: Game State Structure Consistency', () => {
    /**
     * **Feature: ai-player-system, Property 6: Game State Structure Consistency**
     * **Validates: Requirements 4.2, 5.1**
     *
     * Property: For any game containing AI players, the game state structure and API responses
     * should be identical to human-only games except for player type metadata
     *
     * This property ensures that:
     * 1. Game state has the same top-level structure regardless of AI presence
     * 2. All required fields are present in both AI and human-only games
     * 3. Field types are consistent between AI and human-only games
     * 4. Only player metadata differs between AI and human players
     * 5. API responses maintain structural consistency
     * 6. Game lifecycle, board, and move history structures are identical
     */
    it('should maintain identical structure between AI and human-only games', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gameType: fc.constantFrom('test-game-1', 'test-game-2'),
            humanPlayerCount: fc.integer({ min: 1, max: 3 }),
            aiPlayerCount: fc.integer({ min: 1, max: 3 }),
            gameName: fc.option(
              fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
              { nil: undefined }
            ),
            gameDescription: fc.option(fc.string({ minLength: 0, maxLength: 100 }), {
              nil: undefined,
            }),
          }),
          async (config) => {
            // Create fresh instances for each property test run
            const repository = new InMemoryGameRepository();
            const aiRepository = new InMemoryAIPlayerRepository();
            const pluginRegistry = new PluginRegistry();

            // Create AI service
            const aiService = new AIPlayerService(pluginRegistry, aiRepository, repository);

            // Create game manager with AI service
            const gameManager = new GameManagerService(pluginRegistry, repository, aiService);

            // Create and register AI-capable game plugin
            const plugin = new PropertyTestAIGameEngine(config.gameType).withValidationResult({
              valid: true,
            });

            pluginRegistry.register(plugin);

            // Create human players for both games
            const humanPlayers: Player[] = [];
            for (let i = 0; i < config.humanPlayerCount; i++) {
              humanPlayers.push(createPlayer(`human-${i}`, `Human Player ${i + 1}`));
            }

            // Create AI player configurations
            const aiPlayerConfigs = [];
            for (let i = 0; i < config.aiPlayerCount; i++) {
              aiPlayerConfigs.push({
                name: `AI Player ${i + 1}`,
                strategyId: 'default-ai',
                difficulty: 'medium',
              });
            }

            // Create human-only game with same total player count
            const totalPlayers = config.humanPlayerCount + config.aiPlayerCount;
            const humanOnlyPlayers: Player[] = [];
            for (let i = 0; i < totalPlayers; i++) {
              humanOnlyPlayers.push(createPlayer(`human-only-${i}`, `Human Only Player ${i + 1}`));
            }

            const humanOnlyGame = await gameManager.createGame(
              config.gameType,
              {
                players: humanOnlyPlayers,
              },
              undefined, // No authenticated user
              config.gameName,
              config.gameDescription
            );

            // Create mixed game (human + AI players)
            const mixedGame = await gameManager.createGame(
              config.gameType,
              {
                players: humanPlayers,
                aiPlayers: aiPlayerConfigs,
              },
              undefined, // No authenticated user
              config.gameName,
              config.gameDescription
            );

            // Verify structural consistency between games

            // 1. Top-level structure should be identical
            const humanOnlyKeys = Object.keys(humanOnlyGame).sort();
            const mixedGameKeys = Object.keys(mixedGame).sort();
            expect(mixedGameKeys).toEqual(humanOnlyKeys);

            // 2. Core game state fields should have identical types and structure
            expect(typeof humanOnlyGame.gameId).toBe('string');
            expect(typeof mixedGame.gameId).toBe('string');
            expect(humanOnlyGame.gameId).toBeTruthy();
            expect(mixedGame.gameId).toBeTruthy();

            expect(humanOnlyGame.gameType).toBe(config.gameType);
            expect(mixedGame.gameType).toBe(config.gameType);

            expect(humanOnlyGame.lifecycle).toBe(mixedGame.lifecycle);
            expect(Object.values(GameLifecycle)).toContain(humanOnlyGame.lifecycle);
            expect(Object.values(GameLifecycle)).toContain(mixedGame.lifecycle);

            expect(typeof humanOnlyGame.currentPlayerIndex).toBe('number');
            expect(typeof mixedGame.currentPlayerIndex).toBe('number');
            expect(humanOnlyGame.currentPlayerIndex).toBeGreaterThanOrEqual(0);
            expect(mixedGame.currentPlayerIndex).toBeGreaterThanOrEqual(0);

            expect(typeof humanOnlyGame.phase).toBe('string');
            expect(typeof mixedGame.phase).toBe('string');

            expect(typeof humanOnlyGame.version).toBe('number');
            expect(typeof mixedGame.version).toBe('number');
            expect(humanOnlyGame.version).toBeGreaterThan(0);
            expect(mixedGame.version).toBeGreaterThan(0);

            expect(humanOnlyGame.createdAt).toBeInstanceOf(Date);
            expect(mixedGame.createdAt).toBeInstanceOf(Date);

            expect(humanOnlyGame.updatedAt).toBeInstanceOf(Date);
            expect(mixedGame.updatedAt).toBeInstanceOf(Date);

            // 3. Board structure should be identical
            expect(humanOnlyGame.board).toBeDefined();
            expect(mixedGame.board).toBeDefined();
            expect(typeof humanOnlyGame.board).toBe('object');
            expect(typeof mixedGame.board).toBe('object');

            expect(Array.isArray(humanOnlyGame.board.spaces)).toBe(true);
            expect(Array.isArray(mixedGame.board.spaces)).toBe(true);

            expect(typeof humanOnlyGame.board.metadata).toBe('object');
            expect(typeof mixedGame.board.metadata).toBe('object');

            // 4. Move history structure should be identical
            expect(Array.isArray(humanOnlyGame.moveHistory)).toBe(true);
            expect(Array.isArray(mixedGame.moveHistory)).toBe(true);

            // 5. Players array structure should be consistent
            expect(Array.isArray(humanOnlyGame.players)).toBe(true);
            expect(Array.isArray(mixedGame.players)).toBe(true);
            expect(humanOnlyGame.players.length).toBe(totalPlayers);
            expect(mixedGame.players.length).toBe(config.humanPlayerCount + config.aiPlayerCount);

            // 6. Player objects should have consistent structure
            for (const player of humanOnlyGame.players) {
              expect(typeof player.id).toBe('string');
              expect(typeof player.name).toBe('string');
              expect(player.joinedAt).toBeInstanceOf(Date);
              expect(player.id).toBeTruthy();
              expect(player.name).toBeTruthy();
            }

            for (const player of mixedGame.players) {
              expect(typeof player.id).toBe('string');
              expect(typeof player.name).toBe('string');
              expect(player.joinedAt).toBeInstanceOf(Date);
              expect(player.id).toBeTruthy();
              expect(player.name).toBeTruthy();
            }

            // 7. Human players in mixed game should have identical structure to human-only game
            const humanPlayersInMixed = mixedGame.players.filter((p) => !p.metadata?.isAI);
            expect(humanPlayersInMixed.length).toBe(config.humanPlayerCount);

            // Both games should have the same total number of players
            expect(humanOnlyGame.players.length).toBe(mixedGame.players.length);

            // 8. AI players should have additional metadata but same base structure
            const aiPlayersInMixed = mixedGame.players.filter((p) => p.metadata?.isAI === true);
            expect(aiPlayersInMixed.length).toBe(config.aiPlayerCount);

            for (const aiPlayer of aiPlayersInMixed) {
              // Base player structure should be identical
              expect(typeof aiPlayer.id).toBe('string');
              expect(typeof aiPlayer.name).toBe('string');
              expect(aiPlayer.joinedAt).toBeInstanceOf(Date);

              // AI-specific metadata should be present
              expect(aiPlayer.metadata).toBeDefined();
              expect(aiPlayer.metadata!.isAI).toBe(true);
              expect(typeof aiPlayer.metadata!.strategyId).toBe('string');
              expect(aiPlayer.metadata!.strategyId).toBeTruthy();

              if (aiPlayer.metadata!.difficulty) {
                expect(typeof aiPlayer.metadata!.difficulty).toBe('string');
              }
            }

            // 9. Game metadata should have consistent structure
            expect(typeof humanOnlyGame.metadata).toBe('object');
            expect(typeof mixedGame.metadata).toBe('object');

            // Both games should have AI indicators
            expect(typeof humanOnlyGame.metadata.hasAIPlayers).toBe('boolean');
            expect(typeof mixedGame.metadata.hasAIPlayers).toBe('boolean');
            expect(typeof humanOnlyGame.metadata.aiPlayerCount).toBe('number');
            expect(typeof mixedGame.metadata.aiPlayerCount).toBe('number');

            expect(humanOnlyGame.metadata.hasAIPlayers).toBe(false);
            expect(mixedGame.metadata.hasAIPlayers).toBe(true);
            expect(humanOnlyGame.metadata.aiPlayerCount).toBe(0);
            expect(mixedGame.metadata.aiPlayerCount).toBe(config.aiPlayerCount);

            // Game name and description should be consistent
            if (config.gameName) {
              expect(humanOnlyGame.metadata.gameName).toBe(config.gameName);
              expect(mixedGame.metadata.gameName).toBe(config.gameName);
            } else {
              expect(humanOnlyGame.metadata.gameName).toBeUndefined();
              expect(mixedGame.metadata.gameName).toBeUndefined();
            }

            if (config.gameDescription) {
              expect(humanOnlyGame.metadata.gameDescription).toBe(config.gameDescription);
              expect(mixedGame.metadata.gameDescription).toBe(config.gameDescription);
            } else {
              expect(humanOnlyGame.metadata.gameDescription).toBeUndefined();
              expect(mixedGame.metadata.gameDescription).toBeUndefined();
            }

            // 10. Winner field should have consistent type
            expect(humanOnlyGame.winner).toBeNull();
            expect(mixedGame.winner).toBeNull();

            // 11. Verify JSON serialization produces consistent structure
            const humanOnlyJson = JSON.parse(JSON.stringify(humanOnlyGame));
            const mixedGameJson = JSON.parse(JSON.stringify(mixedGame));

            // After serialization, both should have the same top-level keys
            const humanOnlyJsonKeys = Object.keys(humanOnlyJson).sort();
            const mixedGameJsonKeys = Object.keys(mixedGameJson).sort();
            expect(mixedGameJsonKeys).toEqual(humanOnlyJsonKeys);

            // Field types should remain consistent after serialization
            expect(typeof humanOnlyJson.gameId).toBe(typeof mixedGameJson.gameId);
            expect(typeof humanOnlyJson.gameType).toBe(typeof mixedGameJson.gameType);
            expect(typeof humanOnlyJson.lifecycle).toBe(typeof mixedGameJson.lifecycle);
            expect(typeof humanOnlyJson.currentPlayerIndex).toBe(
              typeof mixedGameJson.currentPlayerIndex
            );
            expect(typeof humanOnlyJson.phase).toBe(typeof mixedGameJson.phase);
            expect(typeof humanOnlyJson.version).toBe(typeof mixedGameJson.version);
            expect(Array.isArray(humanOnlyJson.players)).toBe(Array.isArray(mixedGameJson.players));
            expect(Array.isArray(humanOnlyJson.moveHistory)).toBe(
              Array.isArray(mixedGameJson.moveHistory)
            );
            expect(typeof humanOnlyJson.board).toBe(typeof mixedGameJson.board);
            expect(typeof humanOnlyJson.metadata).toBe(typeof mixedGameJson.metadata);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
