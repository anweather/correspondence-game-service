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
});
