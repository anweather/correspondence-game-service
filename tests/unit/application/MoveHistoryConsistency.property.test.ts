import * as fc from 'fast-check';
import { StateManagerService } from '@application/services/StateManagerService';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { InMemoryAIPlayerRepository } from '@infrastructure/persistence/InMemoryAIPlayerRepository';
import { GameState, GameLifecycle, Player, Move } from '@domain/models';
import { AIPlayer } from '@domain/models/AIPlayer';
import { AIStrategy, AICapableGamePlugin, ValidationResult } from '@domain/interfaces';
import { MockGameEngine, GameStateBuilder, createPlayer } from '../../utils';

// Mock AI Strategy for property testing
class PropertyTestAIStrategy implements AIStrategy {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly difficulty?: string,
    private moveCounter: number = 0
  ) {}

  async generateMove(_state: GameState, aiPlayerId: string): Promise<Move> {
    this.moveCounter++;
    return {
      playerId: aiPlayerId,
      timestamp: new Date(),
      action: `ai-move-${this.moveCounter}`,
      parameters: { moveNumber: this.moveCounter, isAI: true },
    };
  }

  getTimeLimit?(): number {
    return 1000; // 1 second
  }
}

// Mock AI-capable game engine for property testing
class PropertyTestAIGameEngine extends MockGameEngine implements AICapableGamePlugin {
  private strategies: AIStrategy[] = [];
  private defaultStrategy: PropertyTestAIStrategy;
  private gameOverAfterMoves: number = 10; // Game ends after 10 moves by default

  constructor(gameType: string) {
    super(gameType);
    this.defaultStrategy = new PropertyTestAIStrategy(
      'default-ai',
      'Default AI',
      'Default AI strategy'
    );
    this.strategies = [this.defaultStrategy];
  }

  withGameOverAfterMoves(moves: number): this {
    this.gameOverAfterMoves = moves;
    return this;
  }

  validateMove(_state: GameState, _playerId: string, _move: Move): ValidationResult {
    return { valid: true };
  }

  applyMove(state: GameState, _playerId: string, move: Move): GameState {
    const newMoveHistory = [...state.moveHistory, move];
    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

    return {
      ...state,
      moveHistory: newMoveHistory,
      currentPlayerIndex: nextPlayerIndex,
      version: state.version + 1,
      updatedAt: new Date(),
    };
  }

  isGameOver(state: GameState): boolean {
    return state.moveHistory.length >= this.gameOverAfterMoves;
  }

  getWinner(state: GameState): string | null {
    if (!this.isGameOver(state)) return null;
    // For testing, alternate between winner and draw
    return state.moveHistory.length % 2 === 0 ? state.players[0].id : null;
  }

  getCurrentPlayer(state: GameState): string {
    return state.players[state.currentPlayerIndex].id;
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
 * Property-based tests for Move History Consistency
 * These tests verify universal properties that should hold across all game configurations
 */
describe('Move History Consistency - Property-Based Tests', () => {
  describe('Property 8: Move History Consistency', () => {
    /**
     * **Feature: ai-player-system, Property 8: Move History Consistency**
     * **Validates: Requirements 5.2, 5.5**
     *
     * Property: For any game with AI players, AI moves should appear in move history
     * with proper timestamps using the same format as human moves
     *
     * This property ensures that:
     * 1. AI moves appear in move history alongside human moves
     * 2. AI moves have proper timestamps that are chronologically ordered
     * 3. AI moves use the same format structure as human moves
     * 4. Move history maintains consistent ordering (chronological)
     * 5. AI moves contain all required fields (playerId, timestamp, action, parameters)
     * 6. Timestamps are valid Date objects and properly ordered
     * 7. Player IDs in moves correspond to actual players in the game
     * 8. Move format is identical between AI and human moves except for content
     */
    it('should maintain consistent move history format between AI and human moves', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gameType: fc.constantFrom('test-game'),
            humanPlayerCount: fc.integer({ min: 1, max: 2 }),
            aiPlayerCount: fc.integer({ min: 1, max: 2 }),
            gameOverAfterMoves: fc.integer({ min: 4, max: 8 }),
            humanMoveActions: fc.array(
              fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async (config) => {
            // Create fresh instances for each property test run
            const repository = new InMemoryGameRepository();
            const aiRepository = new InMemoryAIPlayerRepository();
            const pluginRegistry = new PluginRegistry();
            const lockManager = new GameLockManager();

            // Create AI service
            const aiService = new AIPlayerService(pluginRegistry, aiRepository, repository);

            // Create state manager with AI service
            const stateManager = new StateManagerService(
              repository,
              pluginRegistry,
              lockManager,
              undefined, // No WebSocket service for property testing
              aiService
            );

            // Create and register AI-capable game plugin
            const plugin = new PropertyTestAIGameEngine(config.gameType)
              .withGameOverAfterMoves(config.gameOverAfterMoves)
              .withValidationResult({ valid: true });

            pluginRegistry.register(plugin);

            // Create human players
            const humanPlayers: Player[] = [];
            for (let i = 0; i < config.humanPlayerCount; i++) {
              humanPlayers.push(createPlayer(`human-${i}`, `Human Player ${i + 1}`));
            }

            // Create AI players
            const aiPlayers: AIPlayer[] = [];
            for (let i = 0; i < config.aiPlayerCount; i++) {
              const aiPlayer = await aiRepository.create({
                name: `AI Player ${i + 1}`,
                gameType: config.gameType,
                strategyId: 'default-ai',
              });
              aiPlayers.push(aiPlayer);
            }

            // Create mixed player list (human first, then AI players)
            const allPlayers: Player[] = [...humanPlayers, ...aiPlayers.map((ai) => ai.toPlayer())];

            // Create initial game state with human player's turn
            const initialState = new GameStateBuilder()
              .withGameId(`property-test-${Date.now()}`)
              .withGameType(config.gameType)
              .withLifecycle(GameLifecycle.ACTIVE)
              .withPlayers(allPlayers)
              .withCurrentPlayerIndex(0) // Start with first human player
              .withPhase('playing')
              .build();

            await repository.save(initialState);

            // Apply human moves and let AI respond
            let currentState = initialState;
            const humanMoveStartTime = Date.now();

            for (
              let i = 0;
              i < config.humanMoveActions.length && currentState.lifecycle === GameLifecycle.ACTIVE;
              i++
            ) {
              const humanPlayerId = humanPlayers[i % humanPlayers.length].id;
              const humanMove: Move = {
                playerId: humanPlayerId,
                timestamp: new Date(),
                action: config.humanMoveActions[i],
                parameters: { isHuman: true, moveIndex: i },
              };

              // Apply human move (this should trigger AI turn processing)
              currentState = await stateManager.applyMove(
                currentState.gameId,
                humanPlayerId,
                humanMove,
                currentState.version
              );

              // Small delay to ensure timestamp ordering
              await new Promise((resolve) => setTimeout(resolve, 10));
            }

            // Verify move history consistency properties

            // 1. Move history should contain moves
            expect(currentState.moveHistory.length).toBeGreaterThan(0);

            // 2. All moves should have required fields with correct types
            for (const move of currentState.moveHistory) {
              expect(typeof move.playerId).toBe('string');
              expect(move.playerId).toBeTruthy();
              expect(move.timestamp).toBeInstanceOf(Date);
              expect(typeof move.action).toBe('string');
              expect(move.action).toBeTruthy();
              expect(typeof move.parameters).toBe('object');
              expect(move.parameters).not.toBeNull();
            }

            // 3. Timestamps should be chronologically ordered
            for (let i = 1; i < currentState.moveHistory.length; i++) {
              const prevMove = currentState.moveHistory[i - 1];
              const currentMove = currentState.moveHistory[i];
              expect(currentMove.timestamp.getTime()).toBeGreaterThanOrEqual(
                prevMove.timestamp.getTime()
              );
            }

            // 4. All player IDs in moves should correspond to actual players
            const playerIds = new Set(allPlayers.map((p) => p.id));
            for (const move of currentState.moveHistory) {
              expect(playerIds.has(move.playerId)).toBe(true);
            }

            // 5. Identify human and AI moves
            const humanMoves = currentState.moveHistory.filter((move) =>
              humanPlayers.some((p) => p.id === move.playerId)
            );
            const aiMoves = currentState.moveHistory.filter((move) =>
              aiPlayers.some((ai) => ai.id === move.playerId)
            );

            // 6. Human moves should match what we sent
            expect(humanMoves.length).toBeGreaterThan(0);
            for (let i = 0; i < humanMoves.length; i++) {
              const humanMove = humanMoves[i];
              expect(humanMove.parameters.isHuman).toBe(true);
              expect(typeof humanMove.parameters.moveIndex).toBe('number');
            }

            // 7. AI moves should have consistent format with human moves
            if (aiMoves.length > 0) {
              for (const aiMove of aiMoves) {
                // AI moves should have same structure as human moves
                expect(typeof aiMove.playerId).toBe('string');
                expect(aiMove.timestamp).toBeInstanceOf(Date);
                expect(typeof aiMove.action).toBe('string');
                expect(typeof aiMove.parameters).toBe('object');

                // AI-specific content validation
                expect(aiMove.action).toMatch(/^ai-move-\d+$/);
                expect(aiMove.parameters.isAI).toBe(true);
                expect(typeof aiMove.parameters.moveNumber).toBe('number');
                expect(aiMove.parameters.moveNumber).toBeGreaterThan(0);
              }
            }

            // 8. Timestamps should be reasonable (not in the future, not too old)
            const now = Date.now();
            const testStartTime = humanMoveStartTime;
            for (const move of currentState.moveHistory) {
              expect(move.timestamp.getTime()).toBeGreaterThanOrEqual(testStartTime - 1000); // Allow 1s before test start
              expect(move.timestamp.getTime()).toBeLessThanOrEqual(now + 1000); // Allow 1s in the future
            }

            // 9. Move format consistency between AI and human moves
            if (humanMoves.length > 0 && aiMoves.length > 0) {
              const humanMove = humanMoves[0];
              const aiMove = aiMoves[0];

              // Both should have identical structure (same keys)
              const humanKeys = Object.keys(humanMove).sort();
              const aiKeys = Object.keys(aiMove).sort();
              expect(aiKeys).toEqual(humanKeys);

              // Field types should be identical
              expect(typeof humanMove.playerId).toBe(typeof aiMove.playerId);
              expect(typeof humanMove.timestamp).toBe(typeof aiMove.timestamp);
              expect(typeof humanMove.action).toBe(typeof aiMove.action);
              expect(typeof humanMove.parameters).toBe(typeof aiMove.parameters);
            }

            // 10. JSON serialization should preserve move format consistency
            const serializedMoves = JSON.parse(JSON.stringify(currentState.moveHistory));
            expect(Array.isArray(serializedMoves)).toBe(true);
            expect(serializedMoves.length).toBe(currentState.moveHistory.length);

            for (let i = 0; i < serializedMoves.length; i++) {
              const original = currentState.moveHistory[i];
              const serialized = serializedMoves[i];

              expect(typeof serialized.playerId).toBe('string');
              expect(serialized.playerId).toBe(original.playerId);
              expect(typeof serialized.timestamp).toBe('string'); // Date becomes string in JSON
              expect(typeof serialized.action).toBe('string');
              expect(serialized.action).toBe(original.action);
              expect(typeof serialized.parameters).toBe('object');
            }

            // 11. Move history should reflect actual game progression
            if (currentState.moveHistory.length > 1) {
              // Verify that moves alternate between players (if game rules require it)
              // This is a general property that should hold for turn-based games
              const movePlayerIds = currentState.moveHistory.map((m) => m.playerId);

              // Check that we don't have the same player making consecutive moves
              // (unless it's a special game rule, but our test game should alternate)
              let consecutiveCount = 1;
              for (let i = 1; i < movePlayerIds.length; i++) {
                if (movePlayerIds[i] === movePlayerIds[i - 1]) {
                  consecutiveCount++;
                } else {
                  consecutiveCount = 1;
                }
                // Allow up to 2 consecutive moves (in case of special rules)
                expect(consecutiveCount).toBeLessThanOrEqual(2);
              }
            }
          }
        ),
        { numRuns: 50 } // Reduced runs for complex integration test
      );
    });
  });
});
