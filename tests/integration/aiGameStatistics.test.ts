/**
 * Integration tests for AI game statistics
 * Tests AI player support in statistics tracking and leaderboards
 *
 * Tests cover:
 * - AI game completion recording
 * - AI player exclusion from leaderboards
 * - AI game indicators in player stats
 * - Mixed human/AI game scenarios
 *
 * Requirements: 4.3
 */

import { StatsService } from '@application/services/StatsService';
import { PostgresStatsRepository } from '@infrastructure/persistence/PostgresStatsRepository';
import { GameLifecycle } from '@domain/models';
import { createSharedDatabaseHelper } from '../helpers/databaseTestHelper';

describe('AI Game Statistics Integration', () => {
  const dbHelper = createSharedDatabaseHelper();
  let statsService: StatsService;
  let statsRepository: PostgresStatsRepository;

  beforeEach(() => {
    statsRepository = new PostgresStatsRepository(dbHelper.getConnectionString(), 5);
    statsService = new StatsService(statsRepository);
  });

  afterEach(async () => {
    await statsRepository.close();
  });

  describe('AI Game Completion Recording', () => {
    beforeEach(async () => {
      const pool = dbHelper.getPool();

      // Create player profiles
      await pool.query(`
        INSERT INTO player_profiles (user_id, display_name) 
        VALUES 
          ('human1', 'Human Player 1'),
          ('human2', 'Human Player 2'),
          ('human3', 'Human Player 3')
      `);
    });

    it('should record completed games with AI players for human participants', async () => {
      const pool = dbHelper.getPool();

      // Insert human vs AI game where human wins
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'human-vs-ai-1',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'human1', // Human wins
          JSON.stringify({
            gameId: 'human-vs-ai-1',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              {
                id: 'human1',
                name: 'Human Player 1',
                joinedAt: '2024-01-01T10:00:00Z',
              },
              {
                id: 'ai1',
                name: 'AI Player 1',
                joinedAt: '2024-01-01T10:00:00Z',
                metadata: { isAI: true, strategyId: 'perfect-play' },
              },
            ],
            moveHistory: [
              {
                playerId: 'human1',
                timestamp: '2024-01-01T10:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'ai1',
                timestamp: '2024-01-01T10:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
              {
                playerId: 'human1',
                timestamp: '2024-01-01T10:03:00Z',
                action: 'move',
                parameters: { position: 2 },
              },
              {
                playerId: 'ai1',
                timestamp: '2024-01-01T10:04:00Z',
                action: 'move',
                parameters: { position: 3 },
              },
              {
                playerId: 'human1',
                timestamp: '2024-01-01T10:05:00Z',
                action: 'move',
                parameters: { position: 4 },
              },
            ],
            winner: 'human1',
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:05:00Z',
          }),
          1,
          '2024-01-01T10:00:00Z',
          '2024-01-01T10:05:00Z',
        ]
      );

      // Get stats for human player
      const stats = await statsService.getPlayerStats('human1');

      expect(stats.userId).toBe('human1');
      expect(stats.totalGames).toBe(1);
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(0);
      expect(stats.winRate).toBe(1.0);
      expect(stats.aiGames).toBe(1); // This game included AI
    });

    it('should record AI wins against human players', async () => {
      const pool = dbHelper.getPool();

      // Insert human vs AI game where AI wins
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'ai-vs-human-1',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'ai2', // AI wins
          JSON.stringify({
            gameId: 'ai-vs-human-1',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              {
                id: 'human2',
                name: 'Human Player 2',
                joinedAt: '2024-01-01T11:00:00Z',
              },
              {
                id: 'ai2',
                name: 'AI Player 2',
                joinedAt: '2024-01-01T11:00:00Z',
                metadata: { isAI: true, strategyId: 'perfect-play' },
              },
            ],
            moveHistory: [
              {
                playerId: 'human2',
                timestamp: '2024-01-01T11:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'ai2',
                timestamp: '2024-01-01T11:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
              {
                playerId: 'human2',
                timestamp: '2024-01-01T11:03:00Z',
                action: 'move',
                parameters: { position: 2 },
              },
              {
                playerId: 'ai2',
                timestamp: '2024-01-01T11:04:00Z',
                action: 'move',
                parameters: { position: 3 },
              },
              {
                playerId: 'human2',
                timestamp: '2024-01-01T11:05:00Z',
                action: 'move',
                parameters: { position: 4 },
              },
              {
                playerId: 'ai2',
                timestamp: '2024-01-01T11:06:00Z',
                action: 'move',
                parameters: { position: 5 },
              },
            ],
            winner: 'ai2',
            createdAt: '2024-01-01T11:00:00Z',
            updatedAt: '2024-01-01T11:06:00Z',
          }),
          1,
          '2024-01-01T11:00:00Z',
          '2024-01-01T11:06:00Z',
        ]
      );

      // Get stats for human player
      const stats = await statsService.getPlayerStats('human2');

      expect(stats.userId).toBe('human2');
      expect(stats.totalGames).toBe(1);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(1);
      expect(stats.winRate).toBe(0.0);
      expect(stats.aiGames).toBe(1);
    });

    it('should record draws in AI games', async () => {
      const pool = dbHelper.getPool();

      // Insert human vs AI game that ends in draw
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'draw-game',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          null, // Draw
          JSON.stringify({
            gameId: 'draw-game',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              {
                id: 'human3',
                name: 'Human Player 3',
                joinedAt: '2024-01-01T12:00:00Z',
              },
              {
                id: 'ai3',
                name: 'AI Player 3',
                joinedAt: '2024-01-01T12:00:00Z',
                metadata: { isAI: true, strategyId: 'perfect-play' },
              },
            ],
            moveHistory: Array.from({ length: 9 }, (_, i) => ({
              playerId: i % 2 === 0 ? 'human3' : 'ai3',
              timestamp: `2024-01-01T12:0${i + 1}:00Z`,
              action: 'move',
              parameters: { position: i },
            })),
            winner: null,
            createdAt: '2024-01-01T12:00:00Z',
            updatedAt: '2024-01-01T12:09:00Z',
          }),
          1,
          '2024-01-01T12:00:00Z',
          '2024-01-01T12:09:00Z',
        ]
      );

      // Get stats for human player
      const stats = await statsService.getPlayerStats('human3');

      expect(stats.userId).toBe('human3');
      expect(stats.totalGames).toBe(1);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(1);
      expect(stats.winRate).toBe(0.0); // Draws don't count in win rate
      expect(stats.aiGames).toBe(1);
    });

    it('should handle mixed AI and human games correctly', async () => {
      const pool = dbHelper.getPool();

      // Game 1: Human vs AI (human wins)
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'mixed-game-1',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'human1',
          JSON.stringify({
            gameId: 'mixed-game-1',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'human1', name: 'Human Player 1', joinedAt: '2024-01-01T13:00:00Z' },
              {
                id: 'ai1',
                name: 'AI Player 1',
                joinedAt: '2024-01-01T13:00:00Z',
                metadata: { isAI: true },
              },
            ],
            moveHistory: [
              {
                playerId: 'human1',
                timestamp: '2024-01-01T13:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'ai1',
                timestamp: '2024-01-01T13:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
            ],
            winner: 'human1',
            createdAt: '2024-01-01T13:00:00Z',
            updatedAt: '2024-01-01T13:02:00Z',
          }),
          1,
          '2024-01-01T13:00:00Z',
          '2024-01-01T13:02:00Z',
        ]
      );

      // Game 2: Human vs Human (human1 loses)
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'mixed-game-2',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'human2',
          JSON.stringify({
            gameId: 'mixed-game-2',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'human1', name: 'Human Player 1', joinedAt: '2024-01-01T14:00:00Z' },
              { id: 'human2', name: 'Human Player 2', joinedAt: '2024-01-01T14:00:00Z' },
            ],
            moveHistory: [
              {
                playerId: 'human1',
                timestamp: '2024-01-01T14:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'human2',
                timestamp: '2024-01-01T14:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
            ],
            winner: 'human2',
            createdAt: '2024-01-01T14:00:00Z',
            updatedAt: '2024-01-01T14:02:00Z',
          }),
          1,
          '2024-01-01T14:00:00Z',
          '2024-01-01T14:02:00Z',
        ]
      );

      // Get stats for human1
      const stats = await statsService.getPlayerStats('human1');

      expect(stats.totalGames).toBe(2);
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(1);
      expect(stats.winRate).toBe(0.5);
      expect(stats.aiGames).toBe(1); // Only one game had AI
    });
  });

  describe('AI Player Exclusion from Leaderboards', () => {
    beforeEach(async () => {
      const pool = dbHelper.getPool();

      // Create player profiles
      await pool.query(`
        INSERT INTO player_profiles (user_id, display_name) 
        VALUES 
          ('human1', 'Human Player 1'),
          ('human2', 'Human Player 2')
      `);

      // Human1 vs AI (human wins)
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'leaderboard-game-1',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'human1',
          JSON.stringify({
            gameId: 'leaderboard-game-1',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'human1', name: 'Human Player 1', joinedAt: '2024-01-01T15:00:00Z' },
              {
                id: 'ai1',
                name: 'AI Player 1',
                joinedAt: '2024-01-01T15:00:00Z',
                metadata: { isAI: true },
              },
            ],
            moveHistory: [
              {
                playerId: 'human1',
                timestamp: '2024-01-01T15:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'ai1',
                timestamp: '2024-01-01T15:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
            ],
            winner: 'human1',
            createdAt: '2024-01-01T15:00:00Z',
            updatedAt: '2024-01-01T15:02:00Z',
          }),
          1,
          '2024-01-01T15:00:00Z',
          '2024-01-01T15:02:00Z',
        ]
      );

      // Human2 vs AI (human wins)
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'leaderboard-game-2',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'human2',
          JSON.stringify({
            gameId: 'leaderboard-game-2',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'human2', name: 'Human Player 2', joinedAt: '2024-01-01T16:00:00Z' },
              {
                id: 'ai2',
                name: 'AI Player 2',
                joinedAt: '2024-01-01T16:00:00Z',
                metadata: { isAI: true },
              },
            ],
            moveHistory: [
              {
                playerId: 'human2',
                timestamp: '2024-01-01T16:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'ai2',
                timestamp: '2024-01-01T16:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
            ],
            winner: 'human2',
            createdAt: '2024-01-01T16:00:00Z',
            updatedAt: '2024-01-01T16:02:00Z',
          }),
          1,
          '2024-01-01T16:00:00Z',
          '2024-01-01T16:02:00Z',
        ]
      );
    });

    it('should exclude AI players from leaderboard entries', async () => {
      // Get leaderboard
      const leaderboard = await statsService.getLeaderboard();

      // Should only contain human players
      expect(leaderboard.length).toBe(2);
      expect(leaderboard.map((entry) => entry.userId)).toEqual(
        expect.arrayContaining(['human1', 'human2'])
      );
      expect(leaderboard.map((entry) => entry.userId)).not.toContain('ai1');
      expect(leaderboard.map((entry) => entry.userId)).not.toContain('ai2');

      // Both players should have aiGames = 1
      leaderboard.forEach((entry) => {
        expect(entry.aiGames).toBe(1);
      });
    });

    it('should rank human players correctly regardless of AI game participation', async () => {
      const pool = dbHelper.getPool();

      // Add more games to create different win rates
      // Human1: Additional win vs AI (2 wins, 0 losses = 100%)
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'ranking-game-1',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'human1',
          JSON.stringify({
            gameId: 'ranking-game-1',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'human1', name: 'Human Player 1', joinedAt: '2024-01-01T17:00:00Z' },
              {
                id: 'ai3',
                name: 'AI Player 3',
                joinedAt: '2024-01-01T17:00:00Z',
                metadata: { isAI: true },
              },
            ],
            moveHistory: [
              {
                playerId: 'human1',
                timestamp: '2024-01-01T17:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
            ],
            winner: 'human1',
            createdAt: '2024-01-01T17:00:00Z',
            updatedAt: '2024-01-01T17:01:00Z',
          }),
          1,
          '2024-01-01T17:00:00Z',
          '2024-01-01T17:01:00Z',
        ]
      );

      // Human2: Loss vs AI (1 win, 1 loss = 50%)
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'ranking-game-2',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'ai4',
          JSON.stringify({
            gameId: 'ranking-game-2',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'human2', name: 'Human Player 2', joinedAt: '2024-01-01T18:00:00Z' },
              {
                id: 'ai4',
                name: 'AI Player 4',
                joinedAt: '2024-01-01T18:00:00Z',
                metadata: { isAI: true },
              },
            ],
            moveHistory: [
              {
                playerId: 'human2',
                timestamp: '2024-01-01T18:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
            ],
            winner: 'ai4',
            createdAt: '2024-01-01T18:00:00Z',
            updatedAt: '2024-01-01T18:01:00Z',
          }),
          1,
          '2024-01-01T18:00:00Z',
          '2024-01-01T18:01:00Z',
        ]
      );

      const leaderboard = await statsService.getLeaderboard();

      expect(leaderboard.length).toBe(2);

      // Should be ordered by win rate: human1 (100%) > human2 (50%)
      expect(leaderboard[0].userId).toBe('human1');
      expect(leaderboard[0].winRate).toBe(1.0);
      expect(leaderboard[0].aiGames).toBe(2);

      expect(leaderboard[1].userId).toBe('human2');
      expect(leaderboard[1].winRate).toBe(0.5);
      expect(leaderboard[1].aiGames).toBe(2);
    });
  });

  describe('Game History with AI Games', () => {
    beforeEach(async () => {
      const pool = dbHelper.getPool();

      // Create player profile
      await pool.query(`
        INSERT INTO player_profiles (user_id, display_name) 
        VALUES ('human1', 'Human Player 1')
      `);

      // Create AI game
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'history-ai-game',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'human1',
          JSON.stringify({
            gameId: 'history-ai-game',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'human1', name: 'Human Player 1', joinedAt: '2024-01-01T19:00:00Z' },
              {
                id: 'ai1',
                name: 'AI Player 1',
                joinedAt: '2024-01-01T19:00:00Z',
                metadata: { isAI: true, strategyId: 'perfect-play' },
              },
            ],
            moveHistory: [
              {
                playerId: 'human1',
                timestamp: '2024-01-01T19:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'ai1',
                timestamp: '2024-01-01T19:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
            ],
            winner: 'human1',
            createdAt: '2024-01-01T19:00:00Z',
            updatedAt: '2024-01-01T19:02:00Z',
          }),
          1,
          '2024-01-01T19:00:00Z',
          '2024-01-01T19:02:00Z',
        ]
      );
    });

    it('should include AI games in player history', async () => {
      // Get game history
      const history = await statsService.getGameHistory('human1');

      expect(history.length).toBe(1);
      expect(history[0].gameId).toBe('history-ai-game');
      expect(history[0].players.length).toBe(2);

      // Should include both human and AI player
      const playerIds = history[0].players.map((p) => p.id);
      expect(playerIds).toContain('human1');
      expect(playerIds).toContain('ai1');

      // AI player should have metadata indicating it's an AI
      const aiPlayerInHistory = history[0].players.find((p) => p.id === 'ai1');
      expect(aiPlayerInHistory?.metadata?.isAI).toBe(true);
      expect(aiPlayerInHistory?.metadata?.strategyId).toBe('perfect-play');
    });
  });

  describe('Edge Cases', () => {
    it('should handle AI-only games (should not affect human stats)', async () => {
      const pool = dbHelper.getPool();

      // AI vs AI game
      await pool.query(
        `INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'ai-only-game',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'ai1',
          JSON.stringify({
            gameId: 'ai-only-game',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              {
                id: 'ai1',
                name: 'AI Player 1',
                joinedAt: '2024-01-01T20:00:00Z',
                metadata: { isAI: true },
              },
              {
                id: 'ai2',
                name: 'AI Player 2',
                joinedAt: '2024-01-01T20:00:00Z',
                metadata: { isAI: true },
              },
            ],
            moveHistory: [
              {
                playerId: 'ai1',
                timestamp: '2024-01-01T20:01:00Z',
                action: 'move',
                parameters: { position: 0 },
              },
              {
                playerId: 'ai2',
                timestamp: '2024-01-01T20:02:00Z',
                action: 'move',
                parameters: { position: 1 },
              },
            ],
            winner: 'ai1',
            createdAt: '2024-01-01T20:00:00Z',
            updatedAt: '2024-01-01T20:02:00Z',
          }),
          1,
          '2024-01-01T20:00:00Z',
          '2024-01-01T20:02:00Z',
        ]
      );

      // This shouldn't affect any human player stats
      const leaderboard = await statsService.getLeaderboard();
      expect(leaderboard.length).toBe(0); // No human players
    });

    it('should handle empty results gracefully', async () => {
      // No games in database
      const stats = await statsService.getPlayerStats('nonexistent');
      expect(stats.totalGames).toBe(0);
      expect(stats.aiGames).toBe(0);

      const leaderboard = await statsService.getLeaderboard();
      expect(leaderboard.length).toBe(0);

      const history = await statsService.getGameHistory('nonexistent');
      expect(history.length).toBe(0);
    });
  });
});
