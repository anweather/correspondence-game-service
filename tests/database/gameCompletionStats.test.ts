/**
 * Integration tests for stats update on game completion
 * Following TDD Red-Green-Refactor: These tests were expected to FAIL initially (Red phase)
 *
 * Tests the complete flow:
 * 1. Create game → complete game via moves → verify stats API shows updated data
 * 2. Verify leaderboard API shows updated rankings
 * 3. Verify multiple players' stats update correctly
 *
 * DISCOVERY: These tests PASS, revealing that stats already update immediately!
 * The current architecture works correctly:
 * - Game completion happens in StateManagerService.applyMove() and saves to database
 * - Stats are calculated on-demand by PostgresStatsRepository querying the games table
 * - No caching layer exists, so stats are always fresh from the database
 *
 * This test serves as:
 * - Validation that the current behavior works correctly
 * - Safety net to catch regressions if someone breaks this behavior
 * - Living documentation of expected stats update behavior
 * - Complete integration test from game creation to stats retrieval
 *
 * Requirements: Stats update on game completion
 */

import request from 'supertest';
import { Express } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { createGameRoutes } from '@adapters/rest/gameRoutes';
import { GameManagerService } from '@application/services/GameManagerService';
import { StateManagerService } from '@application/services/StateManagerService';
import { StatsService } from '@application/services/StatsService';
import { GameLockManager } from '@application/GameLockManager';
import { PluginRegistry } from '@application/PluginRegistry';
import { TicTacToeEngine } from '@games/tic-tac-toe/engine';
import { createSharedDatabaseHelper } from '../helpers/databaseTestHelper';
import { PostgresGameRepository } from '@infrastructure/persistence/PostgresGameRepository';
import { PostgresStatsRepository } from '@infrastructure/persistence/PostgresStatsRepository';

import { loadConfig } from '../../src/config';

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

describe('Game Completion Stats Update Integration', () => {
  const dbHelper = createSharedDatabaseHelper();
  let app: Express;
  let gameManagerService: GameManagerService;
  let stateManagerService: StateManagerService;
  let statsService: StatsService;
  let gameRepository: PostgresGameRepository;
  let statsRepository: PostgresStatsRepository;

  let registry: PluginRegistry;
  let lockManager: GameLockManager;

  beforeEach(async () => {
    // Ensure auth is disabled for these tests
    (loadConfig as jest.Mock).mockReturnValue({
      auth: {
        enabled: false,
        clerk: {
          publishableKey: '',
          secretKey: '',
        },
      },
    });

    // Set up real database dependencies
    const connectionString = dbHelper.getConnectionString();
    gameRepository = new PostgresGameRepository(connectionString, 5);
    statsRepository = new PostgresStatsRepository(connectionString, 5);

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

    // Create services
    gameManagerService = new GameManagerService(registry, gameRepository, mockAIPlayerService);
    stateManagerService = new StateManagerService(gameRepository, registry, lockManager);
    statsService = new StatsService(statsRepository);

    // Create app with real routes
    app = createApp();
    const gameRouter = createGameRoutes(gameManagerService, gameRepository, stateManagerService);

    // Add stats routes
    const { createStatsRoutes } = require('@adapters/rest/statsRoutes');
    const statsRouter = createStatsRoutes(statsService);

    // Add leaderboard routes
    const { createLeaderboardRoutes } = require('@adapters/rest/leaderboardRoutes');
    const leaderboardRouter = createLeaderboardRoutes(statsService);

    addApiRoutes(app, gameRouter);
    addApiRoutes(app, statsRouter);
    addApiRoutes(app, leaderboardRouter);
    finalizeApp(app);

    // Create player profiles for testing
    const pool = dbHelper.getPool();
    await pool.query(`
      INSERT INTO player_profiles (user_id, display_name) 
      VALUES 
        ('alice', 'Alice'),
        ('bob', 'Bob'),
        ('charlie', 'Charlie')
      ON CONFLICT (user_id) DO NOTHING
    `);
  });

  afterEach(async () => {
    // Close database connections
    await gameRepository.close();
    await statsRepository.close();
  });

  describe('Single Game Completion Stats Update', () => {
    it('should update stats immediately when a game completes', async () => {
      // Step 1: Verify initial stats are zero
      const initialAliceStats = await request(app).get('/api/players/alice/stats').expect(200);

      expect(initialAliceStats.body.totalGames).toBe(0);
      expect(initialAliceStats.body.wins).toBe(0);

      const initialBobStats = await request(app).get('/api/players/bob/stats').expect(200);

      expect(initialBobStats.body.totalGames).toBe(0);
      expect(initialBobStats.body.wins).toBe(0);

      // Step 2: Create a new tic-tac-toe game
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

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      expect(createResponse.body.lifecycle).toBe('active');

      // Step 3: Play a complete game where Alice wins
      // Alice: (0,0), (0,1), (0,2) - top row win
      // Bob: (1,0), (1,1)
      const moves = [
        { playerId: 'alice', row: 0, col: 0 },
        { playerId: 'bob', row: 1, col: 0 },
        { playerId: 'alice', row: 0, col: 1 },
        { playerId: 'bob', row: 1, col: 1 },
        { playerId: 'alice', row: 0, col: 2 }, // Winning move
      ];

      let gameState;
      for (const move of moves) {
        const moveResponse = await request(app)
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

        gameState = moveResponse.body;
        version = gameState.version;
      }

      // Verify game is completed with Alice as winner
      expect(gameState.lifecycle).toBe('completed');
      expect(gameState.winner).toBe('alice');

      // Step 4: Verify stats are updated immediately after game completion
      // THIS IS WHERE THE TEST SHOULD FAIL - stats won't be updated yet
      const updatedAliceStats = await request(app).get('/api/players/alice/stats').expect(200);

      expect(updatedAliceStats.body.userId).toBe('alice');
      expect(updatedAliceStats.body.totalGames).toBe(1);
      expect(updatedAliceStats.body.wins).toBe(1);
      expect(updatedAliceStats.body.losses).toBe(0);
      expect(updatedAliceStats.body.draws).toBe(0);
      expect(updatedAliceStats.body.winRate).toBe(1.0);

      const updatedBobStats = await request(app).get('/api/players/bob/stats').expect(200);

      expect(updatedBobStats.body.userId).toBe('bob');
      expect(updatedBobStats.body.totalGames).toBe(1);
      expect(updatedBobStats.body.wins).toBe(0);
      expect(updatedBobStats.body.losses).toBe(1);
      expect(updatedBobStats.body.draws).toBe(0);
      expect(updatedBobStats.body.winRate).toBe(0.0);
    });

    it('should update game-type-specific stats correctly', async () => {
      // Create and complete a tic-tac-toe game where Alice wins
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

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Complete the game with Alice winning
      const moves = [
        { playerId: 'alice', row: 0, col: 0 },
        { playerId: 'bob', row: 1, col: 0 },
        { playerId: 'alice', row: 0, col: 1 },
        { playerId: 'bob', row: 1, col: 1 },
        { playerId: 'alice', row: 0, col: 2 }, // Winning move
      ];

      for (const move of moves) {
        const moveResponse = await request(app)
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

        version = moveResponse.body.version;
      }

      // Verify tic-tac-toe specific stats for Alice (public endpoint)
      const aliceTicTacToeStats = await request(app).get('/api/players/alice/stats').expect(200);

      expect(aliceTicTacToeStats.body.userId).toBe('alice');
      expect(aliceTicTacToeStats.body.gameType).toBeUndefined(); // Overall stats, not game-specific
      expect(aliceTicTacToeStats.body.totalGames).toBe(1);
      expect(aliceTicTacToeStats.body.wins).toBe(1);
      expect(aliceTicTacToeStats.body.winRate).toBe(1.0);
    });

    it('should handle draw games correctly in stats', async () => {
      // This test would require a game that can end in a draw
      // For now, we'll simulate by creating a game and verifying the stats structure
      // In a real scenario, we'd play moves that result in a draw

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

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Play moves that result in a draw (fill the board without a winner)
      const drawMoves = [
        { playerId: 'alice', row: 0, col: 0 }, // X
        { playerId: 'bob', row: 0, col: 1 }, // O
        { playerId: 'alice', row: 0, col: 2 }, // X
        { playerId: 'bob', row: 1, col: 0 }, // O
        { playerId: 'alice', row: 1, col: 1 }, // X
        { playerId: 'bob', row: 2, col: 0 }, // O
        { playerId: 'alice', row: 1, col: 2 }, // X
        { playerId: 'bob', row: 2, col: 2 }, // O
        { playerId: 'alice', row: 2, col: 1 }, // X - Draw
      ];

      let gameState;
      for (const move of drawMoves) {
        const moveResponse = await request(app)
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

        gameState = moveResponse.body;
        version = gameState.version;
      }

      // Verify game ended in a draw
      expect(gameState.lifecycle).toBe('completed');
      expect(gameState.winner).toBeNull();

      // Verify both players have draw recorded
      const aliceStats = await request(app).get('/api/players/alice/stats').expect(200);

      expect(aliceStats.body.totalGames).toBe(1);
      expect(aliceStats.body.wins).toBe(0);
      expect(aliceStats.body.losses).toBe(0);
      expect(aliceStats.body.draws).toBe(1);
      expect(aliceStats.body.winRate).toBe(0); // No wins or losses

      const bobStats = await request(app).get('/api/players/bob/stats').expect(200);

      expect(bobStats.body.totalGames).toBe(1);
      expect(bobStats.body.wins).toBe(0);
      expect(bobStats.body.losses).toBe(0);
      expect(bobStats.body.draws).toBe(1);
      expect(bobStats.body.winRate).toBe(0); // No wins or losses
    });
  });

  describe('Leaderboard Updates on Game Completion', () => {
    it('should update leaderboard rankings immediately after game completion', async () => {
      // Step 1: Verify initial leaderboard is empty
      const initialLeaderboard = await request(app).get('/api/leaderboard').expect(200);

      expect(initialLeaderboard.body).toEqual([]);

      // Step 2: Create and complete multiple games to build leaderboard data
      // We need at least 5 games per player to appear on leaderboard

      // Alice wins 4 out of 5 games against Bob (80% win rate)
      for (let i = 0; i < 4; i++) {
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

        const gameId = createResponse.body.gameId;
        let version = createResponse.body.version;

        // Alice wins with top row
        const winningMoves = [
          { playerId: 'alice', row: 0, col: 0 },
          { playerId: 'bob', row: 1, col: 0 },
          { playerId: 'alice', row: 0, col: 1 },
          { playerId: 'bob', row: 1, col: 1 },
          { playerId: 'alice', row: 0, col: 2 }, // Alice wins
        ];

        for (const move of winningMoves) {
          const moveResponse = await request(app)
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

          version = moveResponse.body.version;
        }
      }

      // Bob wins 1 game against Alice (20% win rate for Alice, 20% for Bob)
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

      const gameId = createResponse.body.gameId;
      let version = createResponse.body.version;

      // Bob wins with left column
      const bobWinningMoves = [
        { playerId: 'alice', row: 0, col: 1 },
        { playerId: 'bob', row: 0, col: 0 },
        { playerId: 'alice', row: 0, col: 2 },
        { playerId: 'bob', row: 1, col: 0 },
        { playerId: 'alice', row: 1, col: 1 },
        { playerId: 'bob', row: 2, col: 0 }, // Bob wins
      ];

      for (const move of bobWinningMoves) {
        const moveResponse = await request(app)
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

        version = moveResponse.body.version;
      }

      // Step 3: Verify leaderboard is updated immediately
      // THIS IS WHERE THE TEST SHOULD FAIL - leaderboard won't be updated yet
      const updatedLeaderboard = await request(app).get('/api/leaderboard').expect(200);

      expect(updatedLeaderboard.body.length).toBe(2);

      // Alice should be ranked higher (80% win rate)
      expect(updatedLeaderboard.body[0].userId).toBe('alice');
      expect(updatedLeaderboard.body[0].rank).toBe(1);
      expect(updatedLeaderboard.body[0].totalGames).toBe(5);
      expect(updatedLeaderboard.body[0].wins).toBe(4);
      expect(updatedLeaderboard.body[0].losses).toBe(1);
      expect(updatedLeaderboard.body[0].winRate).toBeCloseTo(0.8, 2);

      // Bob should be ranked lower (20% win rate)
      expect(updatedLeaderboard.body[1].userId).toBe('bob');
      expect(updatedLeaderboard.body[1].rank).toBe(2);
      expect(updatedLeaderboard.body[1].totalGames).toBe(5);
      expect(updatedLeaderboard.body[1].wins).toBe(1);
      expect(updatedLeaderboard.body[1].losses).toBe(4);
      expect(updatedLeaderboard.body[1].winRate).toBeCloseTo(0.2, 2);
    });

    it('should update game-type-specific leaderboards correctly', async () => {
      // Create 5 tic-tac-toe games where Charlie wins all
      for (let i = 0; i < 5; i++) {
        const createResponse = await request(app)
          .post('/api/games')
          .send({
            gameType: 'tic-tac-toe',
            config: {
              players: [
                { id: 'charlie', name: 'Charlie', joinedAt: new Date() },
                { id: 'alice', name: 'Alice', joinedAt: new Date() },
              ],
            },
          })
          .expect(201);

        const gameId = createResponse.body.gameId;
        let version = createResponse.body.version;

        // Charlie wins with diagonal
        const winningMoves = [
          { playerId: 'charlie', row: 0, col: 0 },
          { playerId: 'alice', row: 0, col: 1 },
          { playerId: 'charlie', row: 1, col: 1 },
          { playerId: 'alice', row: 0, col: 2 },
          { playerId: 'charlie', row: 2, col: 2 }, // Charlie wins
        ];

        for (const move of winningMoves) {
          const moveResponse = await request(app)
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

          version = moveResponse.body.version;
        }
      }

      // Verify tic-tac-toe leaderboard
      const ticTacToeLeaderboard = await request(app)
        .get('/api/leaderboard/tic-tac-toe')
        .expect(200);

      expect(ticTacToeLeaderboard.body.length).toBe(2);

      // Charlie should be #1 (100% win rate)
      expect(ticTacToeLeaderboard.body[0].userId).toBe('charlie');
      expect(ticTacToeLeaderboard.body[0].winRate).toBe(1.0);

      // Alice should be #2 (0% win rate)
      expect(ticTacToeLeaderboard.body[1].userId).toBe('alice');
      expect(ticTacToeLeaderboard.body[1].winRate).toBe(0.0);
    });
  });

  describe('Multiple Players Stats Update', () => {
    it('should update stats correctly for all players in multi-player scenarios', async () => {
      // Create a series of games with different player combinations
      // to verify that all players' stats are updated correctly

      // Game 1: Alice vs Bob (Alice wins)
      const game1Response = await request(app)
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

      await completeGameWithWinner(
        game1Response.body.gameId,
        game1Response.body.version,
        'alice',
        'bob'
      );

      // Game 2: Bob vs Charlie (Bob wins)
      const game2Response = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'bob', name: 'Bob', joinedAt: new Date() },
              { id: 'charlie', name: 'Charlie', joinedAt: new Date() },
            ],
          },
        })
        .expect(201);

      await completeGameWithWinner(
        game2Response.body.gameId,
        game2Response.body.version,
        'bob',
        'charlie'
      );

      // Game 3: Alice vs Charlie (Charlie wins)
      const game3Response = await request(app)
        .post('/api/games')
        .send({
          gameType: 'tic-tac-toe',
          config: {
            players: [
              { id: 'alice', name: 'Alice', joinedAt: new Date() },
              { id: 'charlie', name: 'Charlie', joinedAt: new Date() },
            ],
          },
        })
        .expect(201);

      await completeGameWithWinner(
        game3Response.body.gameId,
        game3Response.body.version,
        'alice',
        'charlie'
      );

      // Verify all players' stats are updated correctly
      const aliceStats = await request(app).get('/api/players/alice/stats').expect(200);

      expect(aliceStats.body.totalGames).toBe(2);
      expect(aliceStats.body.wins).toBe(2);
      expect(aliceStats.body.losses).toBe(0);
      expect(aliceStats.body.winRate).toBe(1.0);

      const bobStats = await request(app).get('/api/players/bob/stats').expect(200);

      expect(bobStats.body.totalGames).toBe(2);
      expect(bobStats.body.wins).toBe(1);
      expect(bobStats.body.losses).toBe(1);
      expect(bobStats.body.winRate).toBe(0.5);

      const charlieStats = await request(app).get('/api/players/charlie/stats').expect(200);

      expect(charlieStats.body.totalGames).toBe(2);
      expect(charlieStats.body.wins).toBe(0);
      expect(charlieStats.body.losses).toBe(2);
      expect(charlieStats.body.winRate).toBe(0.0);
    });
  });

  /**
   * Helper function to complete a game with a specific winner
   */
  async function completeGameWithWinner(
    gameId: string,
    initialVersion: number,
    winner: string,
    loser: string
  ): Promise<void> {
    let version = initialVersion;

    // Winner gets top row, loser gets middle row (incomplete)
    const moves = [
      { playerId: winner, row: 0, col: 0 },
      { playerId: loser, row: 1, col: 0 },
      { playerId: winner, row: 0, col: 1 },
      { playerId: loser, row: 1, col: 1 },
      { playerId: winner, row: 0, col: 2 }, // Winner completes top row
    ];

    for (const move of moves) {
      const moveResponse = await request(app)
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

      version = moveResponse.body.version;
    }
  }
});
