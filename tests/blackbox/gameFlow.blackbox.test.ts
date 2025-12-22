import { ApiClient } from './apiClient';

const API_BASE_URL = process.env.BLACKBOX_API_URL || 'http://localhost:3001';

describe('Blackbox API Tests - Complete Game Flow', () => {
  let player1Client: ApiClient;
  let player2Client: ApiClient;

  beforeAll(() => {
    player1Client = new ApiClient({
      baseUrl: API_BASE_URL,
      userId: 'blackbox-player-1',
    });

    player2Client = new ApiClient({
      baseUrl: API_BASE_URL,
      userId: 'blackbox-player-2',
    });
  });

  describe('Happy Path: Create, Play, Complete, and View Stats', () => {
    let gameId: string;
    let gameVersion: number;

    it('should create a new Tic-Tac-Toe game', async () => {
      const game = await player1Client.createGame('tic-tac-toe', {
        players: [
          {
            id: 'blackbox-player-1',
            name: 'Alice',
            joinedAt: new Date().toISOString(),
          },
        ],
      });

      expect(game).toHaveProperty('gameId');
      expect(game).toHaveProperty('gameType', 'tic-tac-toe');
      expect(game).toHaveProperty('lifecycle', 'waiting_for_players');

      gameId = game.gameId;
      gameVersion = game.version;
    });

    it('should allow second player to join the game', async () => {
      const game = await player2Client.joinGame(gameId, {
        id: 'blackbox-player-2',
        name: 'Bob',
        joinedAt: new Date().toISOString(),
      });

      expect(game.lifecycle).toBe('active');
      expect(game.players).toHaveLength(2);
      gameVersion = game.version;
    });

    it('should complete a game with alternating turns (Alice wins)', async () => {
      // Alice wins with top row: (0,0), (0,1), (0,2)
      // Bob plays: (1,0), (1,1)

      // Move 1: Alice (0,0)
      let gameState = await player1Client.makeMove(
        gameId,
        'blackbox-player-1',
        {
          action: 'place',
          parameters: { row: 0, col: 0 },
          playerId: 'blackbox-player-1',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 2: Bob (1,0)
      gameState = await player2Client.makeMove(
        gameId,
        'blackbox-player-2',
        {
          action: 'place',
          parameters: { row: 1, col: 0 },
          playerId: 'blackbox-player-2',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 3: Alice (0,1)
      gameState = await player1Client.makeMove(
        gameId,
        'blackbox-player-1',
        {
          action: 'place',
          parameters: { row: 0, col: 1 },
          playerId: 'blackbox-player-1',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 4: Bob (1,1)
      gameState = await player2Client.makeMove(
        gameId,
        'blackbox-player-2',
        {
          action: 'place',
          parameters: { row: 1, col: 1 },
          playerId: 'blackbox-player-2',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 5: Alice (0,2) - WINNING MOVE
      gameState = await player1Client.makeMove(
        gameId,
        'blackbox-player-1',
        {
          action: 'place',
          parameters: { row: 0, col: 2 },
          playerId: 'blackbox-player-1',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );

      expect(gameState.lifecycle).toBe('completed');
      expect(gameState.winner).toBe('blackbox-player-1');
    });

    it('should retrieve accurate stats after game completion', async () => {
      const aliceStats = await player1Client.getStats();

      expect(aliceStats).toHaveProperty('totalGames');
      expect(aliceStats.totalGames).toBeGreaterThanOrEqual(1);
      expect(aliceStats).toHaveProperty('wins');
      expect(aliceStats.wins).toBeGreaterThanOrEqual(1);

      const bobStats = await player2Client.getStats();
      expect(bobStats.losses).toBeGreaterThanOrEqual(1);
    });
  });
});
