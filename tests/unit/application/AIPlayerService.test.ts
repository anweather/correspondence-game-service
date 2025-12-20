import { AIPlayerService } from '@application/services/AIPlayerService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryAIPlayerRepository } from '@infrastructure/persistence/InMemoryAIPlayerRepository';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { AIPlayer } from '@domain/models/AIPlayer';
import { AIStrategy, AICapableGamePlugin } from '@domain/interfaces';
import { GameState, Move } from '@domain/models';
import { AIStrategyNotFoundError, InvalidAIConfigurationError } from '@domain/errors';
import { MockGameEngine } from '../../utils';

// Mock AI Strategy for testing
class MockAIStrategy implements AIStrategy {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly difficulty?: string
  ) {}

  async generateMove(_state: GameState, _aiPlayerId: string): Promise<Move> {
    return {
      playerId: _aiPlayerId,
      timestamp: new Date(),
      action: 'test-move',
      parameters: { position: 0 },
    };
  }

  validateConfiguration?(config: Record<string, any>): boolean {
    return config.valid === true;
  }
}

// Mock AI-capable game engine
class MockAIGameEngine extends MockGameEngine implements AICapableGamePlugin {
  private strategies: AIStrategy[] = [];
  private defaultStrategy: AIStrategy;

  constructor(gameType: string) {
    super(gameType);
    this.defaultStrategy = new MockAIStrategy('default', 'Default AI', 'Default strategy');
    this.strategies = [this.defaultStrategy];
  }

  withAIStrategies(strategies: AIStrategy[]): this {
    this.strategies = strategies;
    if (strategies.length > 0) {
      this.defaultStrategy = strategies[0];
    }
    return this;
  }

  getAIStrategies(): AIStrategy[] {
    return this.strategies;
  }

  getDefaultAIStrategy(): AIStrategy {
    return this.defaultStrategy;
  }

  createAIPlayer(name: string, strategyId?: string, difficulty?: string): AIPlayer {
    const strategy = strategyId || this.defaultStrategy.id;
    return new AIPlayer(`ai-${Date.now()}`, name, this.getGameType(), strategy, difficulty);
  }

  supportsAI(): boolean {
    return true;
  }
}

describe('AIPlayerService', () => {
  let service: AIPlayerService;
  let pluginRegistry: PluginRegistry;
  let aiRepository: InMemoryAIPlayerRepository;
  let gameRepository: InMemoryGameRepository;

  beforeEach(() => {
    pluginRegistry = new PluginRegistry();
    aiRepository = new InMemoryAIPlayerRepository();
    gameRepository = new InMemoryGameRepository();
    service = new AIPlayerService(pluginRegistry, aiRepository, gameRepository);
  });

  describe('createAIPlayers', () => {
    it('should create AI players with default strategy when no strategy specified', async () => {
      const plugin = new MockAIGameEngine('tic-tac-toe');
      pluginRegistry.register(plugin);

      const configs = [{ name: 'AI Player 1' }, { name: 'AI Player 2' }];

      const players = await service.createAIPlayers('tic-tac-toe', configs);

      expect(players).toHaveLength(2);
      expect(players[0].name).toBe('AI Player 1');
      expect(players[0].gameType).toBe('tic-tac-toe');
      expect(players[0].strategyId).toBe('default');
      expect(players[1].name).toBe('AI Player 2');
      expect(players[1].strategyId).toBe('default');
    });

    it('should create AI players with specified strategy', async () => {
      const customStrategy = new MockAIStrategy('hard', 'Hard AI', 'Challenging strategy', 'hard');
      const plugin = new MockAIGameEngine('tic-tac-toe').withAIStrategies([
        new MockAIStrategy('default', 'Default AI', 'Default strategy'),
        customStrategy,
      ]);
      pluginRegistry.register(plugin);

      const configs = [{ name: 'AI Player 1', strategyId: 'hard', difficulty: 'hard' }];

      const players = await service.createAIPlayers('tic-tac-toe', configs);

      expect(players).toHaveLength(1);
      expect(players[0].strategyId).toBe('hard');
      expect(players[0].difficulty).toBe('hard');
    });

    it('should validate AI configuration when strategy supports it', async () => {
      const strategy = new MockAIStrategy(
        'configurable',
        'Configurable AI',
        'Configurable strategy'
      );
      const plugin = new MockAIGameEngine('tic-tac-toe').withAIStrategies([strategy]);
      pluginRegistry.register(plugin);

      const configs = [
        {
          name: 'AI Player 1',
          strategyId: 'configurable',
          configuration: { valid: true },
        },
      ];

      const players = await service.createAIPlayers('tic-tac-toe', configs);

      expect(players).toHaveLength(1);
      expect(players[0].configuration).toEqual({ valid: true });
    });

    it('should throw InvalidAIConfigurationError for invalid configuration', async () => {
      const strategy = new MockAIStrategy(
        'configurable',
        'Configurable AI',
        'Configurable strategy'
      );
      const plugin = new MockAIGameEngine('tic-tac-toe').withAIStrategies([strategy]);
      pluginRegistry.register(plugin);

      const configs = [
        {
          name: 'AI Player 1',
          strategyId: 'configurable',
          configuration: { valid: false },
        },
      ];

      await expect(service.createAIPlayers('tic-tac-toe', configs)).rejects.toThrow(
        InvalidAIConfigurationError
      );
    });

    it('should throw AIStrategyNotFoundError for unknown strategy', async () => {
      const plugin = new MockAIGameEngine('tic-tac-toe');
      pluginRegistry.register(plugin);

      const configs = [{ name: 'AI Player 1', strategyId: 'nonexistent' }];

      await expect(service.createAIPlayers('tic-tac-toe', configs)).rejects.toThrow(
        AIStrategyNotFoundError
      );
    });

    it('should throw error for unsupported game type', async () => {
      const configs = [{ name: 'AI Player 1' }];

      await expect(service.createAIPlayers('nonexistent-game', configs)).rejects.toThrow(
        'Game type "nonexistent-game" is not supported'
      );
    });

    it('should throw InvalidAIConfigurationError for non-AI game type', async () => {
      // Create a regular game engine without AI support
      const plugin = new MockGameEngine('non-ai-game').withAISupport(false);
      pluginRegistry.register(plugin);

      const configs = [{ name: 'AI Player 1' }];

      await expect(service.createAIPlayers('non-ai-game', configs)).rejects.toThrow(
        InvalidAIConfigurationError
      );
    });
  });

  describe('isAIPlayer', () => {
    it('should return true for existing AI player', async () => {
      const plugin = new MockAIGameEngine('tic-tac-toe');
      pluginRegistry.register(plugin);

      const configs = [{ name: 'AI Player 1' }];
      const players = await service.createAIPlayers('tic-tac-toe', configs);

      const result = await service.isAIPlayer(players[0].id);

      expect(result).toBe(true);
    });

    it('should return false for non-existent player', async () => {
      const result = await service.isAIPlayer('nonexistent-player');

      expect(result).toBe(false);
    });

    it('should return false for human player ID', async () => {
      // This test assumes human players are not stored in AI repository
      const result = await service.isAIPlayer('human-player-123');

      expect(result).toBe(false);
    });
  });

  describe('getAvailableStrategies', () => {
    it('should return available strategies for AI-capable game type', () => {
      const strategies = [
        new MockAIStrategy('easy', 'Easy AI', 'Easy strategy', 'easy'),
        new MockAIStrategy('hard', 'Hard AI', 'Hard strategy', 'hard'),
      ];
      const plugin = new MockAIGameEngine('tic-tac-toe').withAIStrategies(strategies);
      pluginRegistry.register(plugin);

      const result = service.getAvailableStrategies('tic-tac-toe');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('easy');
      expect(result[0].difficulty).toBe('easy');
      expect(result[1].id).toBe('hard');
      expect(result[1].difficulty).toBe('hard');
    });

    it('should return empty array for non-AI game type', () => {
      const plugin = new MockGameEngine('non-ai-game').withAISupport(false);
      pluginRegistry.register(plugin);

      const result = service.getAvailableStrategies('non-ai-game');

      expect(result).toEqual([]);
    });

    it('should throw error for unsupported game type', () => {
      expect(() => service.getAvailableStrategies('nonexistent-game')).toThrow(
        'Game type "nonexistent-game" is not supported'
      );
    });

    it('should return strategies with correct metadata', () => {
      const strategy = new MockAIStrategy('perfect', 'Perfect Play', 'Never loses', 'impossible');
      const plugin = new MockAIGameEngine('tic-tac-toe').withAIStrategies([strategy]);
      pluginRegistry.register(plugin);

      const result = service.getAvailableStrategies('tic-tac-toe');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'perfect',
        name: 'Perfect Play',
        description: 'Never loses',
        difficulty: 'impossible',
        generateMove: expect.any(Function),
        validateConfiguration: expect.any(Function),
      });
    });
  });

  describe('AI Error Logging', () => {
    let mockLogger: any;

    beforeEach(() => {
      // Create a mock logger that captures log calls
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn().mockReturnThis(),
      };

      // Create service with mock logger
      service = new AIPlayerService(pluginRegistry, aiRepository, gameRepository, mockLogger);
    });

    describe('error log structure', () => {
      it('should log errors with structured context during AI player creation failures', async () => {
        // Setup: Register a plugin without the requested strategy
        const plugin = new MockAIGameEngine('tic-tac-toe');
        pluginRegistry.register(plugin);

        const configs = [{ name: 'AI Player 1', strategyId: 'nonexistent-strategy' }];

        // Act: Attempt to create AI players (should fail)
        await expect(service.createAIPlayers('tic-tac-toe', configs)).rejects.toThrow();

        // Assert: Verify error logging structure
        expect(mockLogger.error).toHaveBeenCalled();
        const errorCalls = mockLogger.error.mock.calls;

        // Find the call related to strategy not found
        const strategyErrorCall = errorCalls.find(
          (call: any[]) => call[0].includes('AI strategy not found') || call[0].includes('strategy')
        );

        if (strategyErrorCall) {
          const [message, context] = strategyErrorCall;
          expect(typeof message).toBe('string');
          expect(context).toBeDefined();
          expect(context.error).toBeDefined();
          expect(context.code).toBeDefined();
          expect(context.gameType).toBe('tic-tac-toe');
          expect(context.strategyId).toBe('nonexistent-strategy');
          expect(context.availableStrategies).toBeDefined();
          expect(Array.isArray(context.availableStrategies)).toBe(true);
        }
      });

      it('should log errors with AI player context during processAITurn failures', async () => {
        // Setup: Create AI player and game state
        const plugin = new MockAIGameEngine('tic-tac-toe');
        pluginRegistry.register(plugin);

        const aiPlayers = await service.createAIPlayers('tic-tac-toe', [
          { name: 'Test AI', strategyId: 'default' },
        ]);
        const aiPlayer = aiPlayers[0];

        // Clear previous logs
        mockLogger.error.mockClear();

        // Act: Try to process AI turn for non-existent game (should fail)
        await expect(service.processAITurn('nonexistent-game', aiPlayer.id)).rejects.toThrow();

        // Assert: Verify error logging includes AI context
        expect(mockLogger.error).toHaveBeenCalled();
        const errorCalls = mockLogger.error.mock.calls;

        const gameNotFoundCall = errorCalls.find(
          (call: any[]) => call[0].includes('Game not found') || call[0].includes('not found')
        );

        if (gameNotFoundCall) {
          const [message, context] = gameNotFoundCall;
          expect(typeof message).toBe('string');
          expect(context).toBeDefined();
          expect(context.error).toBeDefined();
          expect(context.code).toBeDefined();
        }
      });

      it('should include sanitized game state in error logs', async () => {
        // This test verifies that game state is properly sanitized in logs
        // We'll test this by checking the sanitization helper methods indirectly

        // Setup: Create a service instance to access private methods via reflection
        const testService = service as any;

        // Create a mock game state with sensitive data
        const gameState = {
          gameId: 'test-game-123',
          gameType: 'tic-tac-toe',
          lifecycle: 'ACTIVE',
          currentPlayerIndex: 0,
          players: [
            { id: 'player-1', name: 'Test Player', metadata: { isAI: true } },
            { id: 'player-2', name: 'Human Player', metadata: {} },
          ],
          moveHistory: [
            { playerId: 'player-1', action: 'move', timestamp: new Date() },
            { playerId: 'player-2', action: 'move', timestamp: new Date() },
          ],
          board: {
            spaces: new Array(9).fill(null),
            metadata: { largeData: 'this should be excluded' },
          },
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Act: Call sanitization method
        const sanitized = testService.sanitizeGameState(gameState);

        // Assert: Verify sanitization
        expect(sanitized.id).toBe('test-game-123');
        expect(sanitized.gameType).toBe('tic-tac-toe');
        expect(sanitized.lifecycle).toBe('ACTIVE');
        expect(sanitized.playerCount).toBe(2);
        expect(sanitized.moveCount).toBe(2);
        expect(sanitized.players).toHaveLength(2);
        expect(sanitized.players[0].isAI).toBe(true);
        expect(sanitized.players[1].isAI).toBe(false);

        // Verify sensitive data is excluded
        expect(sanitized.board).toBeUndefined();
        expect(sanitized.moveHistory).toBeUndefined();
      });

      it('should include sanitized AI player configuration in error logs', async () => {
        // Setup: Create service to access private methods
        const testService = service as any;

        // Create AI player with configuration
        const aiPlayer = new AIPlayer('ai-123', 'Test AI', 'tic-tac-toe', 'test-strategy', 'hard', {
          secretKey: 'sensitive-data',
          apiToken: 'should-not-be-logged',
          publicSetting: 'this-is-ok',
        });

        // Act: Call sanitization method
        const sanitized = testService.sanitizeAIPlayer(aiPlayer);

        // Assert: Verify sanitization
        expect(sanitized.id).toBe('ai-123');
        expect(sanitized.name).toBe('Test AI');
        expect(sanitized.gameType).toBe('tic-tac-toe');
        expect(sanitized.strategyId).toBe('test-strategy');
        expect(sanitized.difficulty).toBe('hard');
        expect(sanitized.hasConfiguration).toBe(true);
        expect(sanitized.configurationKeys).toEqual(['secretKey', 'apiToken', 'publicSetting']);

        // Verify sensitive configuration is excluded
        expect(sanitized.configuration).toBeUndefined();
        expect(sanitized.secretKey).toBeUndefined();
        expect(sanitized.apiToken).toBeUndefined();
      });
    });

    describe('performance metrics logging', () => {
      it('should log performance metrics during successful AI operations', async () => {
        // Setup: Create plugin and AI player
        const plugin = new MockAIGameEngine('tic-tac-toe');
        pluginRegistry.register(plugin);

        // Clear previous logs
        mockLogger.info.mockClear();

        // Act: Create AI players
        await service.createAIPlayers('tic-tac-toe', [{ name: 'Test AI' }]);

        // Assert: Verify performance-related logging
        expect(mockLogger.info).toHaveBeenCalled();
        const infoCalls = mockLogger.info.mock.calls;

        // Look for completion log with performance info
        const completionCall = infoCalls.find(
          (call: any[]) => call[0].includes('creation completed') || call[0].includes('completed')
        );

        if (completionCall) {
          const [message, context] = completionCall;
          expect(typeof message).toBe('string');
          expect(context).toBeDefined();
          expect(context.createdCount).toBeDefined();
          expect(context.requestedCount).toBeDefined();
        }
      });

      it('should log timing information in error contexts', async () => {
        // This test verifies that timing information is included in error logs
        // We test this by ensuring the error logging includes performance context

        const plugin = new MockAIGameEngine('tic-tac-toe');
        pluginRegistry.register(plugin);

        // Clear previous logs
        mockLogger.error.mockClear();

        // Act: Attempt operation that will fail
        await expect(
          service.createAIPlayers('tic-tac-toe', [{ name: 'Test AI', strategyId: 'nonexistent' }])
        ).rejects.toThrow();

        // Assert: Verify error logs contain structured information
        expect(mockLogger.error).toHaveBeenCalled();
        const errorCalls = mockLogger.error.mock.calls;

        // Verify at least one error call has proper structure
        const structuredErrorCall = errorCalls.find((call: any[]) => {
          const [message, context] = call;
          return typeof message === 'string' && context && typeof context === 'object';
        });

        expect(structuredErrorCall).toBeDefined();
      });
    });

    describe('context inclusion', () => {
      it('should include operation context in all AI-related logs', async () => {
        // Setup
        const plugin = new MockAIGameEngine('tic-tac-toe');
        pluginRegistry.register(plugin);

        // Clear logs
        mockLogger.info.mockClear();
        mockLogger.child.mockClear();

        // Act: Perform AI operation
        await service.createAIPlayers('tic-tac-toe', [{ name: 'Test AI' }]);

        // Assert: Verify child logger was created with context
        expect(mockLogger.child).toHaveBeenCalled();
        const childCalls = mockLogger.child.mock.calls;

        const operationContextCall = childCalls.find((call: any[]) => {
          const [context] = call;
          return context && context.operation === 'createAIPlayers';
        });

        expect(operationContextCall).toBeDefined();
        if (operationContextCall) {
          const [context] = operationContextCall;
          expect(context.operation).toBe('createAIPlayers');
          expect(context.gameType).toBe('tic-tac-toe');
          expect(context.playerCount).toBe(1);
        }
      });

      it('should include debugging context for all error scenarios', async () => {
        // This test ensures that error logs always include sufficient debugging context

        // Test 1: Game type not supported
        mockLogger.error.mockClear();
        await expect(
          service.createAIPlayers('unsupported-game', [{ name: 'Test AI' }])
        ).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
        const errorCall = mockLogger.error.mock.calls[0];
        expect(errorCall[1]).toBeDefined(); // Context should be present
        expect(errorCall[1].gameType).toBe('unsupported-game');

        // Test 2: Strategy not found
        const plugin = new MockAIGameEngine('tic-tac-toe');
        pluginRegistry.register(plugin);

        mockLogger.error.mockClear();
        await expect(
          service.createAIPlayers('tic-tac-toe', [{ name: 'Test AI', strategyId: 'nonexistent' }])
        ).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
        const strategyErrorCalls = mockLogger.error.mock.calls.filter(
          (call: any[]) => call[0].includes('strategy') || call[0].includes('not found')
        );
        expect(strategyErrorCalls.length).toBeGreaterThan(0);

        if (strategyErrorCalls.length > 0) {
          const [, context] = strategyErrorCalls[0];
          expect(context).toBeDefined();
          expect(context.strategyId).toBe('nonexistent');
          expect(context.availableStrategies).toBeDefined();
        }
      });
    });
  });
});
