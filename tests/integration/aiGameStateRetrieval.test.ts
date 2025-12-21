import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { createGameRoutes } from '@adapters/rest/gameRoutes';
import { GameManagerService } from '@application/services/GameManagerService';
import { StateManagerService } from '@application/services/StateManagerService';
import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { TicTacToeEngine } from '@games/tic-tac-toe/engine';

// Mock config to disable auth for these tests
jest.mock('../../src/config', () => ({
  loadConfig: jest.fn(() => ({
    auth: {
      enabled: false,
      clerk: {
        publishableKey: '',
        secretKey: '',
      },
    },
  })),
}));

/**
 * Integration tests for AI game state retrieval
 *
 * Tests cover:
 * - Retrieving games with AI players
 * - AI player identification in responses
 * - Move history includes AI moves
 *
 * Requirements: 4.1, 4.4, 5.2, 5.4
 */
describe('AI Game State Retrieval Integration', () => {
  let app: Express;
  let gameManagerService: GameManagerService;
  let stateManagerService: StateManagerService;
  let repository: InMemoryGameRepository;
  let registry: PluginRegistry;
  let lockManager: GameLockManager;
  let mockAIPlayerService: any;

  beforeEach(() => {
    // Set up real dependencies
    repository = new InMemoryGameRepository();
    registry = new PluginRegistry();
    lockManager = new GameLockManager();

    // Register Tic-Tac-Toe plugin
    const ticTacToeEngine = new TicTacToeEngine();
    registry.register(ticTacToeEngine);

    // Create mock AI player service with realistic behavior
    mockAIPlayerService = {
      createAIPlayers: jest.fn(),
      isAIPlayer: jest.fn(),
      getAvailableStrategies: jest.fn().mockReturnValue([]),
      processAITurn: jest.fn(),
    };

    gameManagerService = new GameManagerService(registry, repository, mockAIPlayerService);
    stateManagerService = new StateManagerService(
      repository,
      registry,
      lockManager,
      mockAIPlayerService
    );

    // Create app with real routes
    app = createApp();
    const gameRouter = createGameRoutes(gameManagerService, repository, stateManagerService, mockAIPlayerService);
    addApiRoutes(app, gameRouter);
    finalizeApp(app);
  });

  describe('GET /api/games/:gameId - Retrieving games with AI players', () => {
    it('should retrieve game with AI players and include AI metadata', async () => {
      // Set up mock AI player service to return AI players
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => {
            const aiPlayer = {
              id: `ai-player-${index + 1}`,
              name: config.name,
              gameType,
              strategyId: config.strategyId || 'default',
              difficulty: config.difficulty,
              configuration: config.configuration,
              createdAt: new Date(),
              toPlayer: () => ({
                id: `ai-player-${index + 1}`,
                name: config.name,
                joinedAt: new Date(),
                metadata: {
                  isAI: true,
                  strategyId: config.strategyId || 'default',
                  difficulty: config.difficulty,
                  configuration: config.configuration,
                },
              }),
            };
            return aiPlayer;
          });
        }
      );

      // Create a game with AI players
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'human-player-1', name: 'Alice', joinedAt: new Date() }],
            aiPlayers: [
              {
                name: 'AI Bot',
                strategyId: 'perfect-play',
                difficulty: 'hard',
                configuration: { aggressiveness: 0.8 },
              },
            ],
          },
        })
        .expect(201);

      const gameId = createResponse.body.gameId;

      // Retrieve the game
      const response = await request(app).get(`/api/games/${gameId}`).expect(200);

      // Verify game structure
      expect(response.body.gameId).toBe(gameId);
      expect(response.body.gameType).toBe('tic-tac-toe');
      expect(response.body.players).toHaveLength(2);

      // Verify human player
      const humanPlayer = response.body.players.find((p: any) => p.id === 'human-player-1');
      expect(humanPlayer).toBeDefined();
      expect(humanPlayer.name).toBe('Alice');
      expect(humanPlayer.metadata?.isAI).toBeFalsy();

      // Verify AI player identification
      const aiPlayer = response.body.players.find((p: any) => p.metadata?.isAI === true);
      expect(aiPlayer).toBeDefined();
      expect(aiPlayer.name).toBe('AI Bot');
      expect(aiPlayer.metadata.strategyId).toBe('perfect-play');
      expect(aiPlayer.metadata.difficulty).toBe('hard');
      expect(aiPlayer.metadata.configuration).toEqual({ aggressiveness: 0.8 });

      // Verify AI indicators in game metadata
      expect(response.body.metadata.hasAIPlayers).toBe(true);
      expect(response.body.metadata.aiPlayerCount).toBe(1);
    });

    it('should retrieve game with only AI players', async () => {
      // Set up mock AI player service
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => {
            const aiPlayer = {
              id: `ai-player-${index + 1}`,
              name: config.name,
              gameType,
              strategyId: config.strategyId || 'default',
              difficulty: config.difficulty,
              createdAt: new Date(),
              toPlayer: () => ({
                id: `ai-player-${index + 1}`,
                name: config.name,
                joinedAt: new Date(),
                metadata: {
                  isAI: true,
                  strategyId: config.strategyId || 'default',
                  difficulty: config.difficulty,
                },
              }),
            };
            return aiPlayer;
          });
        }
      );

      // Create a game with only AI players
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            aiPlayers: [
              { name: 'AI Bot 1', strategyId: 'easy' },
              { name: 'AI Bot 2', strategyId: 'hard' },
            ],
          },
        })
        .expect(201);

      const gameId = createResponse.body.gameId;

      // Retrieve the game
      const response = await request(app).get(`/api/games/${gameId}`).expect(200);

      // Verify all players are AI
      expect(response.body.players).toHaveLength(2);
      expect(response.body.players.every((p: any) => p.metadata?.isAI === true)).toBe(true);

      // Verify individual AI players
      const bot1 = response.body.players.find((p: any) => p.name === 'AI Bot 1');
      expect(bot1.metadata.strategyId).toBe('easy');

      const bot2 = response.body.players.find((p: any) => p.name === 'AI Bot 2');
      expect(bot2.metadata.strategyId).toBe('hard');

      // Verify AI indicators
      expect(response.body.metadata.hasAIPlayers).toBe(true);
      expect(response.body.metadata.aiPlayerCount).toBe(2);
    });

    it('should indicate no AI players when none are present', async () => {
      // Create a game with only human players
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'player1', name: 'Alice', joinedAt: new Date() },
              { id: 'player2', name: 'Bob', joinedAt: new Date() },
            ],
          },
        })
        .expect(201);

      const gameId = createResponse.body.gameId;

      // Retrieve the game
      const response = await request(app).get(`/api/games/${gameId}`).expect(200);

      // Verify no AI indicators
      expect(response.body.metadata.hasAIPlayers).toBe(false);
      expect(response.body.metadata.aiPlayerCount).toBe(0);
      expect(response.body.players.every((p: any) => !p.metadata?.isAI)).toBe(true);
    });
  });

  describe('GET /api/games - AI player identification in game list', () => {
    it('should include AI indicators in game list responses', async () => {
      // Set up mock AI player service
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => {
            const aiPlayer = {
              id: `ai-player-${index + 1}`,
              name: config.name,
              gameType,
              strategyId: config.strategyId || 'default',
              difficulty: config.difficulty,
              createdAt: new Date(),
              toPlayer: () => ({
                id: `ai-player-${index + 1}`,
                name: config.name,
                joinedAt: new Date(),
                metadata: {
                  isAI: true,
                  strategyId: config.strategyId || 'default',
                  difficulty: config.difficulty,
                },
              }),
            };
            return aiPlayer;
          });
        }
      );

      // Create a game with AI players
      await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'player1', name: 'Alice', joinedAt: new Date() }],
            aiPlayers: [{ name: 'AI Bot' }],
          },
        });

      // Create a game without AI players
      await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'player2', name: 'Bob', joinedAt: new Date() },
              { id: 'player3', name: 'Charlie', joinedAt: new Date() },
            ],
          },
        });

      // Get game list
      const response = await request(app).get('/api/games').expect(200);

      expect(response.body.items).toHaveLength(2);

      // Find games by AI status
      const aiGame = response.body.items.find((game: any) => game.metadata.hasAIPlayers === true);
      const humanGame = response.body.items.find(
        (game: any) => game.metadata.hasAIPlayers === false
      );

      // Verify AI game
      expect(aiGame).toBeDefined();
      expect(aiGame.metadata.aiPlayerCount).toBe(1);
      expect(aiGame.players.some((p: any) => p.metadata?.isAI === true)).toBe(true);

      // Verify human-only game
      expect(humanGame).toBeDefined();
      expect(humanGame.metadata.aiPlayerCount).toBe(0);
      expect(humanGame.players.every((p: any) => !p.metadata?.isAI)).toBe(true);
    });

    it('should filter games by playerId excluding AI players', async () => {
      // Set up mock AI player service
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => ({
            id: `ai-player-${index + 1}`,
            name: config.name,
            gameType,
            strategyId: 'default',
            createdAt: new Date(),
            toPlayer: () => ({
              id: `ai-player-${index + 1}`,
              name: config.name,
              joinedAt: new Date(),
              metadata: { isAI: true, strategyId: 'default' },
            }),
          }));
        }
      );

      // Create game with specific human player and AI
      await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'target-player', name: 'Alice', joinedAt: new Date() }],
            aiPlayers: [{ name: 'AI Bot' }],
          },
        });

      // Create game without target player
      await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'other-player', name: 'Bob', joinedAt: new Date() },
              { id: 'another-player', name: 'Charlie', joinedAt: new Date() },
            ],
          },
        });

      // Filter by target player
      const response = await request(app).get('/api/games?playerId=target-player').expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].players.some((p: any) => p.id === 'target-player')).toBe(true);
      expect(response.body.items[0].metadata.hasAIPlayers).toBe(true);
    });
  });

  describe('GET /api/games/:gameId/moves - Move history with AI moves', () => {
    it('should include AI moves in move history with proper timestamps', async () => {
      // Set up mock AI player service
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => ({
            id: `ai-player-${index + 1}`,
            name: config.name,
            gameType,
            strategyId: 'default',
            createdAt: new Date(),
            toPlayer: () => ({
              id: `ai-player-${index + 1}`,
              name: config.name,
              joinedAt: new Date(),
              metadata: { isAI: true, strategyId: 'default' },
            }),
          }));
        }
      );

      mockAIPlayerService.isAIPlayer.mockImplementation(async (playerId: string) => {
        return playerId.startsWith('ai-player-');
      });

      // Create a game with human and AI player
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'human-player', name: 'Alice', joinedAt: new Date() }],
            aiPlayers: [{ name: 'AI Bot' }],
          },
        });

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Make a human move
      const humanMoveResponse = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'human-player',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'human-player',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      version = humanMoveResponse.body.version;

      // Simulate AI move by directly applying it
      // (In real scenario, this would be triggered automatically by StateManagerService)
      await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'ai-player-1',
          move: {
            action: 'place',
            parameters: { row: 1, col: 1 },
            playerId: 'ai-player-1',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      // Get move history
      const historyResponse = await request(app).get(`/api/games/${gameId}/moves`).expect(200);

      // Verify move history includes both human and AI moves
      expect(historyResponse.body).toHaveLength(2);

      // Verify human move
      const humanMove = historyResponse.body[0];
      expect(humanMove.playerId).toBe('human-player');
      expect(humanMove.action).toBe('place');
      expect(humanMove.parameters).toEqual({ row: 0, col: 0 });
      expect(humanMove.timestamp).toBeDefined();

      // Verify AI move
      const aiMove = historyResponse.body[1];
      expect(aiMove.playerId).toBe('ai-player-1');
      expect(aiMove.action).toBe('place');
      expect(aiMove.parameters).toEqual({ row: 1, col: 1 });
      expect(aiMove.timestamp).toBeDefined();

      // Verify timestamps are in chronological order
      expect(new Date(aiMove.timestamp).getTime()).toBeGreaterThan(
        new Date(humanMove.timestamp).getTime()
      );
    });

    it('should handle games with only AI moves', async () => {
      // Set up mock AI player service
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => ({
            id: `ai-player-${index + 1}`,
            name: config.name,
            gameType,
            strategyId: 'default',
            createdAt: new Date(),
            toPlayer: () => ({
              id: `ai-player-${index + 1}`,
              name: config.name,
              joinedAt: new Date(),
              metadata: { isAI: true, strategyId: 'default' },
            }),
          }));
        }
      );

      // Create a game with only AI players
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            aiPlayers: [{ name: 'AI Bot 1' }, { name: 'AI Bot 2' }],
          },
        });

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Simulate AI vs AI moves
      await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'ai-player-1',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'ai-player-1',
            timestamp: new Date(),
          },
          version: version,
        });

      version++;

      await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'ai-player-2',
          move: {
            action: 'place',
            parameters: { row: 1, col: 1 },
            playerId: 'ai-player-2',
            timestamp: new Date(),
          },
          version: version,
        });

      // Get move history
      const historyResponse = await request(app).get(`/api/games/${gameId}/moves`).expect(200);

      // Verify all moves are from AI players
      expect(historyResponse.body).toHaveLength(2);
      expect(historyResponse.body[0].playerId).toBe('ai-player-1');
      expect(historyResponse.body[1].playerId).toBe('ai-player-2');

      // Verify move structure is consistent with human moves
      historyResponse.body.forEach((move: any) => {
        expect(move.action).toBe('place');
        expect(move.parameters).toBeDefined();
        expect(move.timestamp).toBeDefined();
        expect(move.playerId).toMatch(/^ai-player-\d+$/);
      });
    });

    it('should return empty move history for new AI games', async () => {
      // Set up mock AI player service
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => ({
            id: `ai-player-${index + 1}`,
            name: config.name,
            gameType,
            strategyId: 'default',
            createdAt: new Date(),
            toPlayer: () => ({
              id: `ai-player-${index + 1}`,
              name: config.name,
              joinedAt: new Date(),
              metadata: { isAI: true, strategyId: 'default' },
            }),
          }));
        }
      );

      // Create a new game with AI players
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'human-player', name: 'Alice', joinedAt: new Date() }],
            aiPlayers: [{ name: 'AI Bot' }],
          },
        });

      const gameId = createResponse.body.gameId;

      // Get move history immediately after creation
      const historyResponse = await request(app).get(`/api/games/${gameId}/moves`).expect(200);

      // Should be empty for new game
      expect(historyResponse.body).toEqual([]);
    });
  });

  describe('GET /api/games/:gameId/state - Game state with AI players', () => {
    it('should return consistent game state structure for AI games', async () => {
      // Set up mock AI player service
      mockAIPlayerService.createAIPlayers.mockImplementation(
        async (gameType: string, aiPlayerConfigs: any[]) => {
          return aiPlayerConfigs.map((config, index) => ({
            id: `ai-player-${index + 1}`,
            name: config.name,
            gameType,
            strategyId: 'default',
            createdAt: new Date(),
            toPlayer: () => ({
              id: `ai-player-${index + 1}`,
              name: config.name,
              joinedAt: new Date(),
              metadata: { isAI: true, strategyId: 'default' },
            }),
          }));
        }
      );

      // Create game with AI players
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'human-player', name: 'Alice', joinedAt: new Date() }],
            aiPlayers: [{ name: 'AI Bot' }],
          },
        });

      const gameId = createResponse.body.gameId;

      // Get game state
      const stateResponse = await request(app).get(`/api/games/${gameId}/state`).expect(200);

      // Verify state structure is identical to human-only games
      expect(stateResponse.body.gameId).toBe(gameId);
      expect(stateResponse.body.gameType).toBe('tic-tac-toe');
      expect(stateResponse.body.lifecycle).toBe('active');
      expect(stateResponse.body.players).toHaveLength(2);
      expect(stateResponse.body.board).toBeDefined();
      expect(stateResponse.body.version).toBeDefined();
      expect(stateResponse.body.currentPlayerIndex).toBeDefined();
      expect(stateResponse.body.moveHistory).toBeDefined();

      // Verify AI player metadata is preserved in state
      const aiPlayer = stateResponse.body.players.find((p: any) => p.metadata?.isAI === true);
      expect(aiPlayer).toBeDefined();
      expect(aiPlayer.metadata.strategyId).toBe('default');
    });
  });
});
