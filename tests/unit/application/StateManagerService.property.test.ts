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
      parameters: { moveNumber: this.moveCounter },
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
 * Property-based tests for StateManagerService AI integration
 * These tests verify universal properties that should hold across all inputs
 */
describe('StateManagerService - Property-Based Tests', () => {
  describe('Property 3: Automatic AI Turn Processing', () => {
    /**
     * **Feature: ai-player-system, Property 3: Automatic AI Turn Processing**
     * **Validates: Requirements 2.1, 2.5**
     *
     * Property: For any game state where it becomes an AI player's turn, the system should
     * automatically trigger move generation and apply the move within the time limit
     *
     * This property ensures that:
     * 1. AI turns are automatically detected after human moves
     * 2. AI moves are generated and applied without human intervention
     * 3. Consecutive AI turns are processed until a human player's turn
     * 4. The system stops processing when the game ends
     * 5. Move history correctly reflects both human and AI moves
     */
    it('should automatically process AI turns until human player or game end', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gameType: fc.constantFrom('test-game'),
            humanPlayerCount: fc.integer({ min: 1, max: 2 }),
            aiPlayerCount: fc.integer({ min: 1, max: 3 }),
            gameOverAfterMoves: fc.integer({ min: 3, max: 8 }),
            humanMoveAction: fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => s.trim().length > 0),
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

            // Apply human move (this should trigger AI turn processing)
            const humanMove: Move = {
              playerId: humanPlayers[0].id,
              timestamp: new Date(),
              action: config.humanMoveAction,
              parameters: { test: true },
            };

            const startTime = Date.now();
            const finalState = await stateManager.applyMove(
              initialState.gameId,
              humanPlayers[0].id,
              humanMove,
              1
            );
            const endTime = Date.now();

            // Verify automatic AI turn processing properties

            // 1. Human move should be recorded
            expect(finalState.moveHistory.length).toBeGreaterThanOrEqual(1);
            expect(finalState.moveHistory[0]).toMatchObject({
              playerId: humanPlayers[0].id,
              action: config.humanMoveAction,
            });

            // 2. If there are AI players after the human, AI moves should be processed
            // 2. Check if AI moves should have been processed
            // This depends on the player order and turn sequence
            const nextPlayerAfterHuman = allPlayers[(0 + 1) % allPlayers.length];
            const isNextPlayerAI = aiPlayers.some((ai) => ai.id === nextPlayerAfterHuman.id);

            if (isNextPlayerAI && finalState.moveHistory.length < config.gameOverAfterMoves) {
              // AI moves should have been processed
              expect(finalState.moveHistory.length).toBeGreaterThan(1);

              // Verify AI moves are in the move history
              const aiMoves = finalState.moveHistory.slice(1); // Skip human move
              for (const aiMove of aiMoves) {
                expect(aiMove.action).toMatch(/^ai-move-\d+$/);
                expect(aiMove.parameters).toHaveProperty('moveNumber');
                expect(typeof aiMove.parameters.moveNumber).toBe('number');
              }
            }

            // 3. Processing should complete within reasonable time (AI timeout + overhead)
            const maxExpectedTime = config.aiPlayerCount * 1000 + 2000; // 1s per AI + 2s overhead
            expect(endTime - startTime).toBeLessThan(maxExpectedTime);

            // 4. Game state should be consistent
            expect(finalState.version).toBeGreaterThan(initialState.version);
            expect(finalState.updatedAt.getTime()).toBeGreaterThanOrEqual(
              initialState.updatedAt.getTime()
            );

            // 5. If game ended, it should be marked as completed
            if (finalState.moveHistory.length >= config.gameOverAfterMoves) {
              expect(finalState.lifecycle).toBe(GameLifecycle.COMPLETED);
              expect(finalState.winner).toBeDefined(); // Can be null for draw
            } else {
              expect(finalState.lifecycle).toBe(GameLifecycle.ACTIVE);
            }

            // 6. Current player should be valid
            if (finalState.lifecycle === GameLifecycle.ACTIVE) {
              expect(finalState.currentPlayerIndex).toBeGreaterThanOrEqual(0);
              expect(finalState.currentPlayerIndex).toBeLessThan(allPlayers.length);

              const currentPlayer = allPlayers[finalState.currentPlayerIndex];
              expect(currentPlayer).toBeDefined();
              expect(currentPlayer.id).toBeDefined();
            }

            // 7. Move history should have valid timestamps
            for (let i = 1; i < finalState.moveHistory.length; i++) {
              const prevMove = finalState.moveHistory[i - 1];
              const currentMove = finalState.moveHistory[i];
              expect(currentMove.timestamp.getTime()).toBeGreaterThanOrEqual(
                prevMove.timestamp.getTime()
              );
            }
          }
        ),
        { numRuns: 50 } // Reduced runs for complex integration test
      );
    });
  });
});
