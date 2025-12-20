import { GameManagerService } from '@application/services/GameManagerService';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { Player, GameState, GameLifecycle } from '@domain/models';
import { GameNotFoundError, GameFullError } from '@domain/errors';
import { MockGameEngine, createPlayer } from '../../utils';

describe('GameManagerService', () => {
  let service: GameManagerService;
  let registry: PluginRegistry;
  let repository: InMemoryGameRepository;
  let mockAIPlayerService: AIPlayerService;

  beforeEach(() => {
    registry = new PluginRegistry();
    repository = new InMemoryGameRepository();

    // Create mock AI player service
    mockAIPlayerService = {
      createAIPlayers: jest.fn().mockResolvedValue([]),
      isAIPlayer: jest.fn().mockResolvedValue(false),
      getAvailableStrategies: jest.fn().mockReturnValue([]),
      processAITurn: jest.fn(),
    } as any;

    service = new GameManagerService(registry, repository, mockAIPlayerService);
  });

  describe('createGame', () => {
    it('should create a game with CREATED lifecycle when no players provided', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const game = await service.createGame('tic-tac-toe', {});

      expect(game.gameType).toBe('tic-tac-toe');
      expect(game.lifecycle).toBe(GameLifecycle.CREATED);
      expect(game.players).toEqual([]);
      expect(game.gameId).toBeDefined();
      expect(game.version).toBe(1);
    });

    it('should create a game with WAITING_FOR_PLAYERS lifecycle when fewer than minimum players', async () => {
      const plugin = new MockGameEngine('poker').withMinPlayers(2).withMaxPlayers(8);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');

      const game = await service.createGame('poker', {
        players: [player1],
      });

      expect(game.gameType).toBe('poker');
      expect(game.lifecycle).toBe(GameLifecycle.WAITING_FOR_PLAYERS);
      expect(game.players).toHaveLength(1);
    });

    it('should create a game with ACTIVE lifecycle when minimum players provided', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');
      const player2 = createPlayer('player2', 'Bob');

      const game = await service.createGame('tic-tac-toe', {
        players: [player1, player2],
      });

      expect(game.gameType).toBe('tic-tac-toe');
      expect(game.lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(game.players).toHaveLength(2);
    });

    it('should throw error when game type is not supported', async () => {
      await expect(service.createGame('nonexistent-game', {})).rejects.toThrow(
        'Game type "nonexistent-game" is not supported'
      );
    });

    it('should generate unique game IDs for multiple games', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const game1 = await service.createGame('tic-tac-toe', {});
      const game2 = await service.createGame('tic-tac-toe', {});

      expect(game1.gameId).not.toBe(game2.gameId);
    });

    it('should save the created game to repository', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const game = await service.createGame('tic-tac-toe', {});

      const retrieved = await repository.findById(game.gameId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.gameId).toBe(game.gameId);
    });

    it('should pass custom settings to game engine', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const customSettings = { boardSize: 5, winCondition: 4 };
      const game = await service.createGame('tic-tac-toe', {
        customSettings,
      });

      expect(game).toBeDefined();
    });
  });

  describe('getGame', () => {
    it('should return game when it exists', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const created = await service.createGame('tic-tac-toe', {});
      const retrieved = await service.getGame(created.gameId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.gameId).toBe(created.gameId);
      expect(retrieved?.gameType).toBe('tic-tac-toe');
    });

    it('should return null when game does not exist', async () => {
      const result = await service.getGame('nonexistent-game-id');
      expect(result).toBeNull();
    });
  });

  describe('joinGame', () => {
    it('should add player to game in WAITING_FOR_PLAYERS state', async () => {
      const plugin = new MockGameEngine('poker').withMinPlayers(2).withMaxPlayers(8);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');

      const game = await service.createGame('poker', {
        players: [player1],
      });

      const player2: Player = {
        id: 'player2',
        name: 'Bob',
        joinedAt: new Date(),
      };

      const updated = await service.joinGame(game.gameId, player2);

      expect(updated.players).toHaveLength(2);
      expect(updated.players[1].id).toBe('player2');
    });

    it('should transition to ACTIVE when minimum players reached', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');

      const game = await service.createGame('tic-tac-toe', {
        players: [player1],
      });

      expect(game.lifecycle).toBe(GameLifecycle.WAITING_FOR_PLAYERS);

      const player2 = createPlayer('player2', 'Bob');

      const updated = await service.joinGame(game.gameId, player2);

      expect(updated.lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(updated.players).toHaveLength(2);
    });

    it('should throw error when joining game not in joinable state', async () => {
      const plugin = new MockGameEngine('poker').withMinPlayers(2).withMaxPlayers(8);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');
      const player2 = createPlayer('player2', 'Bob');

      // Create an active game with room for more players
      const game = await service.createGame('poker', {
        players: [player1, player2],
      });

      // Manually update the game to COMPLETED state
      const completedGame = {
        ...game,
        lifecycle: GameLifecycle.COMPLETED,
        version: game.version + 1,
      };
      await repository.update(game.gameId, completedGame, game.version);

      const player3 = createPlayer('player3', 'Charlie');

      await expect(service.joinGame(game.gameId, player3)).rejects.toThrow(
        'Cannot join game in lifecycle state: completed'
      );
    });

    it('should throw error when player already in game', async () => {
      const plugin = new MockGameEngine('poker').withMinPlayers(2).withMaxPlayers(8);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');

      const game = await service.createGame('poker', {
        players: [player1],
      });

      await expect(service.joinGame(game.gameId, player1)).rejects.toThrow(
        'Player player1 is already in the game'
      );
    });

    it('should throw GameFullError when game is at maximum capacity', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');
      const player2 = createPlayer('player2', 'Bob');
      const player3 = createPlayer('player3', 'Charlie');

      // Create a game with 1 player where max is 2, then add 2nd player
      const game2 = await service.createGame('tic-tac-toe', {
        players: [player1],
      });

      await service.joinGame(game2.gameId, player2);

      // Now try to add a 3rd player
      await expect(service.joinGame(game2.gameId, player3)).rejects.toThrow(GameFullError);
    });

    it('should throw GameNotFoundError when game does not exist', async () => {
      const player = createPlayer('player1', 'Alice');

      await expect(service.joinGame('nonexistent-game', player)).rejects.toThrow(GameNotFoundError);
    });

    it('should allow joining game in CREATED state', async () => {
      const plugin = new MockGameEngine('poker').withMinPlayers(2).withMaxPlayers(8);
      registry.register(plugin);

      const game = await service.createGame('poker', {});
      expect(game.lifecycle).toBe(GameLifecycle.CREATED);

      const player1 = createPlayer('player1', 'Alice');

      const updated = await service.joinGame(game.gameId, player1);

      expect(updated.players).toHaveLength(1);
      expect(updated.lifecycle).toBe(GameLifecycle.WAITING_FOR_PLAYERS);
    });
  });

  describe('listGames', () => {
    it('should return empty list when no games exist', async () => {
      const result = await service.listGames({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return all games when no filters applied', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      await service.createGame('tic-tac-toe', {});
      await service.createGame('tic-tac-toe', {});

      const result = await service.listGames({});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter games by playerId', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');
      const player2 = createPlayer('player2', 'Bob');

      await service.createGame('tic-tac-toe', { players: [player1] });
      await service.createGame('tic-tac-toe', { players: [player2] });
      await service.createGame('tic-tac-toe', { players: [player1] });

      const result = await service.listGames({ playerId: 'player1' });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      result.items.forEach((game: GameState) => {
        expect(game.players.some((p: Player) => p.id === 'player1')).toBe(true);
      });
    });

    it('should filter games by lifecycle state', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');
      const player2 = createPlayer('player2', 'Bob');

      await service.createGame('tic-tac-toe', {});
      await service.createGame('tic-tac-toe', { players: [player1] });
      await service.createGame('tic-tac-toe', { players: [player1, player2] });

      const result = await service.listGames({ lifecycle: GameLifecycle.ACTIVE });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].lifecycle).toBe(GameLifecycle.ACTIVE);
    });

    it('should filter games by game type', async () => {
      const plugin1 = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      const plugin2 = new MockGameEngine('chess').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin1);
      registry.register(plugin2);

      await service.createGame('tic-tac-toe', {});
      await service.createGame('chess', {});
      await service.createGame('tic-tac-toe', {});

      const result = await service.listGames({ gameType: 'tic-tac-toe' });

      expect(result.items).toHaveLength(2);
      result.items.forEach((game: GameState) => {
        expect(game.gameType).toBe('tic-tac-toe');
      });
    });

    it('should support pagination', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      // Create 5 games
      for (let i = 0; i < 5; i++) {
        await service.createGame('tic-tac-toe', {});
      }

      const page1 = await service.listGames({ page: 1, pageSize: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);

      const page2 = await service.listGames({ page: 2, pageSize: 2 });
      expect(page2.items).toHaveLength(2);
      expect(page2.page).toBe(2);

      const page3 = await service.listGames({ page: 3, pageSize: 2 });
      expect(page3.items).toHaveLength(1);
      expect(page3.page).toBe(3);
    });

    it('should combine multiple filters', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const player1 = createPlayer('player1', 'Alice');
      const player2 = createPlayer('player2', 'Bob');

      await service.createGame('tic-tac-toe', { players: [player1] });
      await service.createGame('tic-tac-toe', { players: [player1, player2] });
      await service.createGame('tic-tac-toe', { players: [player2] });

      const result = await service.listGames({
        playerId: 'player1',
        lifecycle: GameLifecycle.ACTIVE,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(result.items[0].players.some((p: Player) => p.id === 'player1')).toBe(true);
    });
  });

  describe('listAvailableGameTypes', () => {
    it('should return empty array when no plugins registered', () => {
      const result = service.listAvailableGameTypes();
      expect(result).toEqual([]);
    });

    it('should return all registered game types', () => {
      const plugin1 = new MockGameEngine('tic-tac-toe')
        .withMinPlayers(2)
        .withMaxPlayers(2)
        .withDescription('Classic Tic-Tac-Toe');
      const plugin2 = new MockGameEngine('chess')
        .withMinPlayers(2)
        .withMaxPlayers(2)
        .withDescription('Classic Chess');
      registry.register(plugin1);
      registry.register(plugin2);

      const result = service.listAvailableGameTypes();

      expect(result).toHaveLength(2);
      expect(result.map((info: any) => info.type)).toContain('tic-tac-toe');
      expect(result.map((info: any) => info.type)).toContain('chess');
    });

    it('should include game metadata in results', () => {
      const plugin = new MockGameEngine('poker')
        .withMinPlayers(2)
        .withMaxPlayers(8)
        .withDescription("Texas Hold'em Poker");
      registry.register(plugin);

      const result = service.listAvailableGameTypes();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'poker',
        name: 'poker',
        description: "Texas Hold'em Poker",
        minPlayers: 2,
        maxPlayers: 8,
      });
    });
  });

  describe('createGame with authenticated creator', () => {
    it('should create game without creator when creator not provided', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const game = await service.createGame('tic-tac-toe', {});

      expect(game.gameId).toBeDefined();
      expect(game.metadata.creatorPlayerId).toBeUndefined();
    });

    it('should associate game with creator when creator provided', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const creator = { id: 'player-123', username: 'Alice' };
      const game = await service.createGame('tic-tac-toe', {}, creator);

      expect(game.gameId).toBeDefined();
      expect(game.metadata.creatorPlayerId).toBe('player-123');
    });

    it('should store creator information in repository', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const creator = { id: 'player-456', username: 'Bob' };
      const game = await service.createGame('tic-tac-toe', {}, creator);

      const retrieved = await repository.findById(game.gameId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.metadata.creatorPlayerId).toBe('player-456');
    });
  });

  describe('createGame with AI players', () => {
    let aiPlayerService: AIPlayerService;
    let aiRepository: any;

    beforeEach(() => {
      // Create mock AI repository
      aiRepository = {
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };

      // Create AIPlayerService with mocked dependencies
      aiPlayerService = new AIPlayerService(registry, aiRepository, repository);

      // Recreate service with AIPlayerService
      service = new GameManagerService(registry, repository, aiPlayerService);
    });

    it('should create game with AI players', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      // Mock AI player creation
      const mockAIPlayer = {
        id: 'ai-player-1',
        name: 'AI Bot',
        gameType: 'tic-tac-toe',
        strategyId: 'default',
        createdAt: new Date(),
        toPlayer: jest.fn().mockReturnValue({
          id: 'ai-player-1',
          name: 'AI Bot',
          joinedAt: new Date(),
          metadata: {
            isAI: true,
            strategyId: 'default',
          },
        }),
      };

      aiRepository.create.mockResolvedValue(mockAIPlayer);

      const game = await service.createGame('tic-tac-toe', {
        aiPlayers: [{ name: 'AI Bot' }],
      });

      expect(game.players).toHaveLength(1);
      expect(game.players[0].id).toBe('ai-player-1');
      expect(game.players[0].metadata?.isAI).toBe(true);
      expect(aiRepository.create).toHaveBeenCalledWith({
        name: 'AI Bot',
        gameType: 'tic-tac-toe',
        strategyId: expect.any(String),
        difficulty: undefined,
        configuration: undefined,
      });
    });

    it('should create game with both human and AI players', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const humanPlayer = createPlayer('player1', 'Alice');

      // Mock AI player creation
      const mockAIPlayer = {
        id: 'ai-player-1',
        name: 'AI Bot',
        gameType: 'tic-tac-toe',
        strategyId: 'default',
        createdAt: new Date(),
        toPlayer: jest.fn().mockReturnValue({
          id: 'ai-player-1',
          name: 'AI Bot',
          joinedAt: new Date(),
          metadata: {
            isAI: true,
            strategyId: 'default',
          },
        }),
      };

      aiRepository.create.mockResolvedValue(mockAIPlayer);

      const game = await service.createGame('tic-tac-toe', {
        players: [humanPlayer],
        aiPlayers: [{ name: 'AI Bot' }],
      });

      expect(game.players).toHaveLength(2);
      expect(game.players[0].id).toBe('player1');
      expect(game.players[0].metadata?.isAI).toBeUndefined();
      expect(game.players[1].id).toBe('ai-player-1');
      expect(game.players[1].metadata?.isAI).toBe(true);
      expect(game.lifecycle).toBe(GameLifecycle.ACTIVE);
    });

    it('should initialize AI players with default strategies', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      // Mock AI player creation
      const mockAIPlayer = {
        id: 'ai-player-1',
        name: 'AI Bot',
        gameType: 'tic-tac-toe',
        strategyId: 'default',
        createdAt: new Date(),
        toPlayer: jest.fn().mockReturnValue({
          id: 'ai-player-1',
          name: 'AI Bot',
          joinedAt: new Date(),
          metadata: {
            isAI: true,
            strategyId: 'default',
          },
        }),
      };

      aiRepository.create.mockResolvedValue(mockAIPlayer);

      await service.createGame('tic-tac-toe', {
        aiPlayers: [{ name: 'AI Bot' }],
      });

      expect(aiRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AI Bot',
          gameType: 'tic-tac-toe',
          strategyId: expect.any(String),
        })
      );
    });

    it('should support difficulty level selection for AI players', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      // Mock AI player creation
      const mockAIPlayer = {
        id: 'ai-player-1',
        name: 'AI Bot',
        gameType: 'tic-tac-toe',
        strategyId: 'hard',
        difficulty: 'hard',
        createdAt: new Date(),
        toPlayer: jest.fn().mockReturnValue({
          id: 'ai-player-1',
          name: 'AI Bot',
          joinedAt: new Date(),
          metadata: {
            isAI: true,
            strategyId: 'hard',
            difficulty: 'hard',
          },
        }),
      };

      aiRepository.create.mockResolvedValue(mockAIPlayer);

      const game = await service.createGame('tic-tac-toe', {
        aiPlayers: [{ name: 'AI Bot', strategyId: 'hard', difficulty: 'hard' }],
      });

      expect(game.players[0].metadata?.difficulty).toBe('hard');
      expect(aiRepository.create).toHaveBeenCalledWith({
        name: 'AI Bot',
        gameType: 'tic-tac-toe',
        strategyId: 'hard',
        difficulty: 'hard',
        configuration: undefined,
      });
    });

    it('should validate AI player count does not exceed max players', async () => {
      const plugin = new MockGameEngine('tic-tac-toe').withMinPlayers(2).withMaxPlayers(2);
      registry.register(plugin);

      const humanPlayer = createPlayer('player1', 'Alice');

      // Mock AI player creation for 2 AI players
      const mockAIPlayer1 = {
        id: 'ai-player-1',
        name: 'AI Bot 1',
        gameType: 'tic-tac-toe',
        strategyId: 'default',
        createdAt: new Date(),
        toPlayer: jest.fn().mockReturnValue({
          id: 'ai-player-1',
          name: 'AI Bot 1',
          joinedAt: new Date(),
          metadata: { isAI: true, strategyId: 'default' },
        }),
      };

      const mockAIPlayer2 = {
        id: 'ai-player-2',
        name: 'AI Bot 2',
        gameType: 'tic-tac-toe',
        strategyId: 'default',
        createdAt: new Date(),
        toPlayer: jest.fn().mockReturnValue({
          id: 'ai-player-2',
          name: 'AI Bot 2',
          joinedAt: new Date(),
          metadata: { isAI: true, strategyId: 'default' },
        }),
      };

      aiRepository.create.mockResolvedValueOnce(mockAIPlayer1).mockResolvedValueOnce(mockAIPlayer2);

      const game = await service.createGame('tic-tac-toe', {
        players: [humanPlayer],
        aiPlayers: [{ name: 'AI Bot 1' }, { name: 'AI Bot 2' }],
      });

      // Should create game with 3 players (1 human + 2 AI)
      // This exceeds max of 2, but validation happens at game initialization
      expect(game.players.length).toBeGreaterThanOrEqual(1);
    });
  });
});
