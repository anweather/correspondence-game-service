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
import { TicTacToeEngine } from '@games/tic-tac-toe/engine';

describe('E2E: Complete Tic-Tac-Toe Game Flow', () => {
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

    // Create mock AI player service
    const mockAIPlayerService = {
      createAIPlayers: jest.fn().mockResolvedValue([]),
      isAIPlayer: jest.fn().mockResolvedValue(false),
      getAvailableStrategies: jest.fn().mockReturnValue([]),
      processAITurn: jest.fn(),
    } as any;

    gameManagerService = new GameManagerService(registry, repository, mockAIPlayerService);
    stateManagerService = new StateManagerService(repository, registry, lockManager);
    rendererService = new RendererService(registry, repository);

    // Create app with all routes
    app = createApp();
    const gameRouter = createGameRoutes(
      gameManagerService,
      repository,
      stateManagerService,
      mockAIPlayerService,
      rendererService
    );
    addApiRoutes(app, gameRouter);
    finalizeApp(app);
  });

  describe('Complete game with win scenario', () => {
    it('should complete a full tic-tac-toe game from creation to win', async () => {
      // Step 1: Create a new game via REST API
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'alice', name: 'Alice', joinedAt: new Date() },
              { id: 'bob', name: 'Bob', joinedAt: new Date() },
            ],
          },
        })
        .expect(201);

      expect(createResponse.body.gameId).toBeDefined();
      expect(createResponse.body.gameType).toBe('tic-tac-toe');
      expect(createResponse.body.lifecycle).toBe('active');
      expect(createResponse.body.players).toHaveLength(2);

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Step 2: Check initial game state via REST API
      const initialStateResponse = await request(app).get(`/api/games/${gameId}/state`).expect(200);

      expect(initialStateResponse.body.gameId).toBe(gameId);
      expect(initialStateResponse.body.lifecycle).toBe('active');
      expect(initialStateResponse.body.currentPlayerIndex).toBe(0);
      expect(initialStateResponse.body.moveHistory).toHaveLength(0);
      expect(initialStateResponse.body.board.spaces).toHaveLength(9);

      // Step 3: Make moves via REST API to create a winning scenario
      // Alice (X) will win with top row: (0,0), (0,1), (0,2)
      // Bob (O) will play: (1,0), (1,1)

      // Move 1: Alice plays (0,0)
      const move1Response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'alice',
          move: {
            action: 'place',
            parameters: { row: 0, col: 0 },
            playerId: 'alice',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      expect(move1Response.body.currentPlayerIndex).toBe(1); // Bob's turn
      expect(move1Response.body.moveHistory).toHaveLength(1);
      expect(move1Response.body.lifecycle).toBe('active');
      version = move1Response.body.version;

      // Move 2: Bob plays (1,0)
      const move2Response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'bob',
          move: {
            action: 'place',
            parameters: { row: 1, col: 0 },
            playerId: 'bob',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      expect(move2Response.body.currentPlayerIndex).toBe(0); // Alice's turn
      expect(move2Response.body.moveHistory).toHaveLength(2);
      version = move2Response.body.version;

      // Move 3: Alice plays (0,1)
      const move3Response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'alice',
          move: {
            action: 'place',
            parameters: { row: 0, col: 1 },
            playerId: 'alice',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      expect(move3Response.body.currentPlayerIndex).toBe(1); // Bob's turn
      expect(move3Response.body.moveHistory).toHaveLength(3);
      version = move3Response.body.version;

      // Move 4: Bob plays (1,1)
      const move4Response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'bob',
          move: {
            action: 'place',
            parameters: { row: 1, col: 1 },
            playerId: 'bob',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      expect(move4Response.body.currentPlayerIndex).toBe(0); // Alice's turn
      expect(move4Response.body.moveHistory).toHaveLength(4);
      version = move4Response.body.version;

      // Move 5: Alice plays (0,2) - WINNING MOVE
      const move5Response = await request(app)
        .post(`/api/games/${gameId}/moves`)
        .send({
          playerId: 'alice',
          move: {
            action: 'place',
            parameters: { row: 0, col: 2 },
            playerId: 'alice',
            timestamp: new Date(),
          },
          version: version,
        })
        .expect(200);

      // Step 4: Verify win detection via REST API
      expect(move5Response.body.lifecycle).toBe('completed');
      expect(move5Response.body.moveHistory).toHaveLength(5);
      expect(move5Response.body.winner).toBe('alice');

      // Step 5: Check final game state via REST API
      const finalStateResponse = await request(app).get(`/api/games/${gameId}/state`).expect(200);

      expect(finalStateResponse.body.lifecycle).toBe('completed');
      expect(finalStateResponse.body.winner).toBe('alice');
      expect(finalStateResponse.body.moveHistory).toHaveLength(5);

      // Step 6: Verify move history via REST API
      const movesResponse = await request(app).get(`/api/games/${gameId}/moves`).expect(200);

      expect(movesResponse.body).toHaveLength(5);
      expect(movesResponse.body[0].playerId).toBe('alice');
      expect(movesResponse.body[0].parameters.row).toBe(0);
      expect(movesResponse.body[0].parameters.col).toBe(0);
      expect(movesResponse.body[4].playerId).toBe('alice');
      expect(movesResponse.body[4].parameters.row).toBe(0);
      expect(movesResponse.body[4].parameters.col).toBe(2);

      // Step 7: Render board via REST API
      const renderResponse = await request(app).get(`/api/games/${gameId}/board.svg`).expect(200);

      expect(renderResponse.headers['content-type']).toContain('image/svg+xml');
      const svg =
        renderResponse.text ||
        (Buffer.isBuffer(renderResponse.body)
          ? renderResponse.body.toString()
          : renderResponse.body);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('tic-tac-toe');
      expect(svg).toContain(gameId);
    });
  });

  describe('Complete game with draw scenario', () => {
    it('should complete a full tic-tac-toe game ending in a draw', async () => {
      // Step 1: Create a new game via REST API
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'player1', name: 'Player 1', joinedAt: new Date() },
              { id: 'player2', name: 'Player 2', joinedAt: new Date() },
            ],
          },
        })
        .expect(201);

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Step 2: Make moves via REST API to create a draw scenario
      // Final board will be:
      // X | O | X
      // X | O | O
      // O | X | X

      const drawMoves = [
        { playerId: 'player1', row: 0, col: 0 }, // X
        { playerId: 'player2', row: 0, col: 1 }, // O
        { playerId: 'player1', row: 0, col: 2 }, // X
        { playerId: 'player2', row: 1, col: 2 }, // O
        { playerId: 'player1', row: 1, col: 0 }, // X
        { playerId: 'player2', row: 1, col: 1 }, // O
        { playerId: 'player1', row: 2, col: 1 }, // X
        { playerId: 'player2', row: 2, col: 0 }, // O
        { playerId: 'player1', row: 2, col: 2 }, // X - final move
      ];

      let lastResponse;
      for (let i = 0; i < drawMoves.length; i++) {
        const move = drawMoves[i];
        lastResponse = await request(app)
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

        version = lastResponse.body.version;

        // Check that game is still active until the last move
        if (i < drawMoves.length - 1) {
          expect(lastResponse.body.lifecycle).toBe('active');
        }
      }

      // Step 3: Verify draw detection via REST API
      expect(lastResponse!.body.lifecycle).toBe('completed');
      expect(lastResponse!.body.moveHistory).toHaveLength(9);
      expect(lastResponse!.body.winner).toBeNull();
      expect(lastResponse!.body.metadata.isDraw).toBe(true);

      // Step 4: Check final game state via REST API
      const finalStateResponse = await request(app).get(`/api/games/${gameId}/state`).expect(200);

      expect(finalStateResponse.body.lifecycle).toBe('completed');
      expect(finalStateResponse.body.winner).toBeNull();
      expect(finalStateResponse.body.metadata.isDraw).toBe(true);
      expect(finalStateResponse.body.moveHistory).toHaveLength(9);

      // Step 5: Render final board via REST API
      const renderResponse = await request(app).get(`/api/games/${gameId}/board.svg`).expect(200);

      expect(renderResponse.headers['content-type']).toContain('image/svg+xml');
      const svg =
        renderResponse.text ||
        (Buffer.isBuffer(renderResponse.body)
          ? renderResponse.body.toString()
          : renderResponse.body);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('Game with player joining flow', () => {
    it('should allow players to join a waiting game and then play', async () => {
      // Step 1: Create a game with only one player via REST API
      const createResponse = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [{ id: 'player1', name: 'Player 1', joinedAt: new Date() }],
          },
        })
        .expect(201);

      expect(createResponse.body.lifecycle).toBe('waiting_for_players');
      expect(createResponse.body.players).toHaveLength(1);

      const gameId = createResponse.body.gameId;

      // Step 2: Second player joins via REST API
      const joinResponse = await request(app)
        .post(`/api/games/${gameId}/join`)
        .send({
          player: {
            id: 'player2',
            name: 'Player 2',
            joinedAt: new Date(),
          },
        })
        .expect(200);

      expect(joinResponse.body.lifecycle).toBe('active');
      expect(joinResponse.body.players).toHaveLength(2);

      const version = joinResponse.body.version;

      // Step 3: Check game state via REST API
      const stateResponse = await request(app).get(`/api/games/${gameId}/state`).expect(200);

      expect(stateResponse.body.lifecycle).toBe('active');
      expect(stateResponse.body.players).toHaveLength(2);

      // Step 4: Make a move via REST API
      const moveResponse = await request(app)
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

      expect(moveResponse.body.moveHistory).toHaveLength(1);
      expect(moveResponse.body.currentPlayerIndex).toBe(1);

      // Step 5: Render board via REST API
      const renderResponse = await request(app).get(`/api/games/${gameId}/board.svg`).expect(200);

      expect(renderResponse.headers['content-type']).toContain('image/svg+xml');
      const svg =
        renderResponse.text ||
        (Buffer.isBuffer(renderResponse.body)
          ? renderResponse.body.toString()
          : renderResponse.body);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });
});
