import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { createGameRoutes } from '@adapters/rest/gameRoutes';
import { GameManagerService } from '@application/services/GameManagerService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { TicTacToeEngine } from '@adapters/plugins/tic-tac-toe/TicTacToeEngine';

describe('Game Management Routes Integration', () => {
  let app: Express;
  let gameManagerService: GameManagerService;
  let repository: InMemoryGameRepository;
  let registry: PluginRegistry;

  beforeEach(() => {
    // Set up real dependencies
    repository = new InMemoryGameRepository();
    registry = new PluginRegistry();
    
    // Register Tic-Tac-Toe plugin
    const ticTacToeEngine = new TicTacToeEngine();
    registry.register(ticTacToeEngine);
    
    gameManagerService = new GameManagerService(registry, repository);

    // Create app with real routes
    app = createApp();
    const gameRouter = createGameRoutes(gameManagerService, repository);
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
      const response = await request(app)
        .get('/api/games')
        .expect(200);

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

      const response = await request(app)
        .get('/api/games')
        .expect(200);

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

      const response = await request(app)
        .get('/api/games?playerId=player1')
        .expect(200);

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

      const response = await request(app)
        .get(`/api/games/${gameId}`)
        .expect(200);

      expect(response.body.gameId).toBe(gameId);
      expect(response.body.gameType).toBe('tic-tac-toe');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-id')
        .expect(404);

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
            players: [
              { id: 'player1', name: 'Alice', joinedAt: new Date() },
            ],
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
            players: [
              { id: 'player1', name: 'Alice', joinedAt: new Date() },
            ],
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
      await request(app)
        .delete(`/api/games/${gameId}`)
        .expect(204);

      // Verify it's gone
      await request(app)
        .get(`/api/games/${gameId}`)
        .expect(404);
    });
  });

  describe('GET /api/game-types', () => {
    it('should return list of available game types', async () => {
      const response = await request(app)
        .get('/api/game-types')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('tic-tac-toe');
      expect(response.body[0].minPlayers).toBe(2);
      expect(response.body[0].maxPlayers).toBe(2);
    });
  });
});
