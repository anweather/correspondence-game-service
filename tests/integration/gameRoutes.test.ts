import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { createGameRoutes } from '@adapters/rest/gameRoutes';
import { GameManagerService } from '@application/services/GameManagerService';
import { StateManagerService } from '@application/services/StateManagerService';
import { RendererService } from '@infrastructure/rendering/RendererService';
import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { TicTacToeEngine } from '@adapters/plugins/tic-tac-toe/TicTacToeEngine';

describe('Game Management Routes Integration', () => {
  let app: Express;
  let gameManagerService: GameManagerService;
  let stateManagerService: StateManagerService;
  let repository: InMemoryGameRepository;
  let registry: PluginRegistry;
  let lockManager: GameLockManager;

  beforeEach(() => {
    // Set up real dependencies
    repository = new InMemoryGameRepository();
    registry = new PluginRegistry();
    lockManager = new GameLockManager();

    // Register Tic-Tac-Toe plugin
    const ticTacToeEngine = new TicTacToeEngine();
    registry.register(ticTacToeEngine);

    gameManagerService = new GameManagerService(registry, repository);
    stateManagerService = new StateManagerService(repository, registry, lockManager);

    // Create app with real routes
    app = createApp();
    const gameRouter = createGameRoutes(gameManagerService, repository, stateManagerService);
    addApiRoutes(app, gameRouter);
    finalizeApp(app);
  });

  describe('POST /api/games', () => {
    it('should create a new tic-tac-toe game', async () => {
      const response = await request(app)
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

      expect(response.body.gameId).toBeDefined();
      expect(response.body.gameType).toBe('tic-tac-toe');
      expect(response.body.lifecycle).toBe('active');
      expect(response.body.players).toHaveLength(2);
    });

    it('should return error for unsupported game type', async () => {
      const response = await request(app)
        .post('/api/games')
        .send({
          gameType: 'chess',
          config: {},
        })
        .expect(500);

      expect(response.body.error.message).toContain('not supported');
    });
  });

  describe('GET /api/games', () => {
    it('should return empty list when no games exist', async () => {
      const response = await request(app).get('/api/games').expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should return list of games', async () => {
      // Create a game first
      await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'player1', name: 'Alice', joinedAt: new Date() },
              { id: 'player2', name: 'Bob', joinedAt: new Date() },
            ],
          },
        });

      const response = await request(app).get('/api/games').expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it('should filter games by playerId', async () => {
      // Create two games
      await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'player1', name: 'Alice', joinedAt: new Date() },
              { id: 'player2', name: 'Bob', joinedAt: new Date() },
            ],
          },
        });

      await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'player3', name: 'Charlie', joinedAt: new Date() },
              { id: 'player4', name: 'Dave', joinedAt: new Date() },
            ],
          },
        });

      const response = await request(app).get('/api/games?playerId=player1').expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].players.some((p: any) => p.id === 'player1')).toBe(true);
    });
  });

  describe('GET /api/games/:gameId', () => {
    it('should return game by ID', async () => {
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
        });

      const gameId = createResponse.body.gameId;

      const response = await request(app).get(`/api/games/${gameId}`).expect(200);

      expect(response.body.gameId).toBe(gameId);
      expect(response.body.gameType).toBe('tic-tac-toe');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app).get('/api/games/nonexistent-id').expect(404);

      expect(response.body.error.code).toBe('GAME_NOT_FOUND');
    });
  });

  describe('POST /api/games/:gameId/join', () => {
    it('should allow player to join waiting game', async () => {
      // Create game with one player
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'player1', name: 'Alice', joinedAt: new Date() }],
          },
        });

      const gameId = createResponse.body.gameId;
      expect(createResponse.body.lifecycle).toBe('waiting_for_players');

      // Join with second player
      const joinResponse = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({
          player: {
            id: 'player2',
            name: 'Bob',
            joinedAt: new Date(),
          },
        })
        .expect(200);

      expect(joinResponse.body.players).toHaveLength(2);
      expect(joinResponse.body.lifecycle).toBe('active');
    });

    it('should return 409 when game is full', async () => {
      // Create game with two players (full for tic-tac-toe)
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
        });

      const gameId = createResponse.body.gameId;

      // Try to join with third player
      const response = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({
          player: {
            id: 'player3',
            name: 'Charlie',
            joinedAt: new Date(),
          },
        })
        .expect(409);

      expect(response.body.error.code).toBe('GAME_FULL');
    });

    it('should prevent duplicate player', async () => {
      // Create game with one player
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'player1', name: 'Alice', joinedAt: new Date() }],
          },
        });

      const gameId = createResponse.body.gameId;

      // Try to join with same player
      const response = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({
          player: {
            id: 'player1',
            name: 'Alice',
            joinedAt: new Date(),
          },
        })
        .expect(500);

      expect(response.body.error.message).toContain('already in the game');
    });
  });

  describe('DELETE /api/games/:gameId', () => {
    it('should delete a game', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;

      // Delete the game
      await request(app).delete(`/api/games/${gameId}`).expect(204);

      // Verify it's gone
      await request(app).get(`/api/games/${gameId}`).expect(404);
    });
  });

  describe('GET /api/game-types', () => {
    it('should return list of available game types', async () => {
      const response = await request(app).get('/api/game-types').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('tic-tac-toe');
      expect(response.body[0].minPlayers).toBe(2);
      expect(response.body[0].maxPlayers).toBe(2);
    });
  });
});

describe('Gameplay Routes Integration', () => {
  let app: Express;
  let gameManagerService: GameManagerService;
  let stateManagerService: StateManagerService;
  let repository: InMemoryGameRepository;
  let registry: PluginRegistry;
  let lockManager: GameLockManager;

  beforeEach(() => {
    // Set up real dependencies
    repository = new InMemoryGameRepository();
    registry = new PluginRegistry();
    lockManager = new GameLockManager();

    // Register Tic-Tac-Toe plugin
    const ticTacToeEngine = new TicTacToeEngine();
    registry.register(ticTacToeEngine);

    gameManagerService = new GameManagerService(registry, repository);
    stateManagerService = new StateManagerService(repository, registry, lockManager);

    // Create app with real routes
    app = createApp();
    const gameRouter = createGameRoutes(gameManagerService, repository, stateManagerService);
    addApiRoutes(app, gameRouter);
    finalizeApp(app);
  });

  describe('GET /api/games/:gameId/state', () => {
    it('should return current game state', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;

      // Get game state
      const response = await request(app).get(`/api/games/${gameId}/state`).expect(200);

      expect(response.body.gameId).toBe(gameId);
      expect(response.body.gameType).toBe('tic-tac-toe');
      expect(response.body.lifecycle).toBe('active');
      expect(response.body.players).toHaveLength(2);
      expect(response.body.board).toBeDefined();
      expect(response.body.version).toBeDefined();
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app).get('/api/games/nonexistent-id/state').expect(404);

      expect(response.body.error.code).toBe('GAME_NOT_FOUND');
    });
  });

  describe('POST /api/games/:gameId/moves', () => {
    it('should apply a valid move', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      const version = createResponse.body.version;

      // Make a move
      const response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player1',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'player1',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      expect(response.body.gameId).toBe(gameId);
      expect(response.body.version).toBe(version + 1);
      expect(response.body.moveHistory).toHaveLength(1);
      expect(response.body.currentPlayerIndex).toBe(1); // Turn advanced to player2
    });

    it('should return 400 for invalid move', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      const version = createResponse.body.version;

      // Try to make an invalid move (out of bounds)
      const response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player1',
          move: {
            action: 'place',
            parameters: { row: 5, col: 5 },
            playerId: 'player1',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_MOVE');
    });

    it('should return 403 for unauthorized move (wrong player)', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      const version = createResponse.body.version;

      // Try to make a move as player2 when it's player1's turn
      const response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player2',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'player2',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(403);

      expect(response.body.error.code).toBe('UNAUTHORIZED_MOVE');
    });

    it('should return 403 for player not in game', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      const version = createResponse.body.version;

      // Try to make a move as player3 who is not in the game
      const response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player3',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'player3',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(403);

      expect(response.body.error.code).toBe('UNAUTHORIZED_MOVE');
    });

    it('should return 409 for version conflict (optimistic locking)', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      const version = createResponse.body.version;

      // Make first move
      await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player1',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'player1',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      // Try to make another move with stale version
      const response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player2',
          move: {
            action: 'place',
            parameters: { row: 1, col: 1 },
            playerId: 'player2',
            timestamp: new Date(),
          },
          version: version, // Using old version
        })
        .expect(409);

      expect(response.body.error.code).toBe('STALE_STATE');
    });

    it('should detect game completion', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Play a winning sequence for player1
      // Player1: (0,0), (0,1), (0,2) - top row
      // Player2: (1,0), (1,1)

      const moves = [
        { playerId: 'player1', row: 0, col: 0 },
        { playerId: 'player2', row: 1, col: 0 },
        { playerId: 'player1', row: 0, col: 1 },
        { playerId: 'player2', row: 1, col: 1 },
        { playerId: 'player1', row: 0, col: 2 }, // Winning move
      ];

      let response;
      for (const move of moves) {
        response = await request(app)
          .post(`/api/games/${gameId}/moves`)
          .send({
            playerId: move.playerId,
            move: {
              action: 'place',
              parameters: { row: move.row, col: move.col },
              playerId: move.playerId,
              timestamp: new Date(),
            },
            version: version,
          })
          .expect(200);

        version = response.body.version;
      }

      // Check that game is completed
      expect(response!.body.lifecycle).toBe('completed');
    });
  });

  describe('GET /api/games/:gameId/moves', () => {
    it('should return move history', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Make a couple of moves
      await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player1',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'player1',
            timestamp: new Date(),
          },
          version: version,
        });

      version++;

      await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player2',
          move: {
            action: 'place',
            parameters: { row: 1, col: 1 },
            playerId: 'player2',
            timestamp: new Date(),
          },
          version: version,
        });

      // Get move history
      const response = await request(app).get(`/api/games/${gameId}/moves`).expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].playerId).toBe('player1');
      expect(response.body[0].action).toBe('place');
      expect(response.body[1].playerId).toBe('player2');
    });

    it('should return empty array for game with no moves', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;

      // Get move history
      const response = await request(app).get(`/api/games/${gameId}/moves`).expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app).get('/api/games/nonexistent-id/moves').expect(404);

      expect(response.body.error.code).toBe('GAME_NOT_FOUND');
    });
  });
});

describe('Rendering Routes Integration', () => {
  let app: Express;
  let gameManagerService: GameManagerService;
  let stateManagerService: StateManagerService;
  let rendererService: RendererService;
  let repository: InMemoryGameRepository;
  let registry: PluginRegistry;
  let lockManager: GameLockManager;

  beforeEach(() => {
    // Set up real dependencies
    repository = new InMemoryGameRepository();
    registry = new PluginRegistry();
    lockManager = new GameLockManager();

    // Register Tic-Tac-Toe plugin
    const ticTacToeEngine = new TicTacToeEngine();
    registry.register(ticTacToeEngine);

    gameManagerService = new GameManagerService(registry, repository);
    stateManagerService = new StateManagerService(repository, registry, lockManager);
    rendererService = new RendererService(registry, repository);

    // Create app with real routes including renderer
    app = createApp();
    const gameRouter = createGameRoutes(
      gameManagerService,
      repository,
      stateManagerService,
      rendererService
    );
    addApiRoutes(app, gameRouter);
    finalizeApp(app);
  });

  describe('GET /api/games/:gameId/board.svg', () => {
    it('should return SVG board rendering with proper content-type', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;

      // Get SVG rendering
      const response = await request(app).get(`/api/games/${gameId}/board.svg`).expect(200);

      // Check content-type header
      expect(response.headers['content-type']).toContain('image/svg+xml');

      // Check that response is valid SVG
      const svg =
        response.text ||
        (Buffer.isBuffer(response.body) ? response.body.toString() : response.body);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should render board with game state', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;
      const version = createResponse.body.version;

      // Make a move
      await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'player1',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'player1',
            timestamp: new Date(),
          },
          version: version,
        });

      // Get SVG rendering
      const response = await request(app).get(`/api/games/${gameId}/board.svg`).expect(200);

      // Check that SVG contains game metadata in frame layer
      const svg =
        response.text ||
        (Buffer.isBuffer(response.body) ? response.body.toString() : response.body);
      expect(svg).toContain('tic-tac-toe');
      expect(svg).toContain(gameId);

      // Check that SVG has proper structure
      expect(svg).toContain('id="board"');
      expect(svg).toContain('id="frame"');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app).get('/api/games/nonexistent-id/board.svg').expect(404);

      expect(response.body.error.code).toBe('GAME_NOT_FOUND');
    });

    it('should handle rendering errors gracefully', async () => {
      // Create a game
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
        });

      const gameId = createResponse.body.gameId;

      // Unregister the plugin to simulate rendering error
      registry.unregister('tic-tac-toe');

      // Try to render - should get error
      const response = await request(app).get(`/api/games/${gameId}/board.svg`).expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('plugin');
    });
  });
});
