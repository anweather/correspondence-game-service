/**
 * PostgresStatsRepository Database Integration Tests
 * Tests the repository against a real PostgreSQL database
 * This will catch schema mismatches, SQL syntax errors, and data type issues
 */

import { PostgresStatsRepository } from '@infrastructure/persistence/PostgresStatsRepository';
import { GameLifecycle } from '@domain/models';
import { createSharedDatabaseHelper } from '../helpers/databaseTestHelper';

describe('PostgresStatsRepository Database Integration', () => {
  const dbHelper = createSharedDatabaseHelper();
  let repository: PostgresStatsRepository;

  beforeEach(() => {
    repository = new PostgresStatsRepository(dbHelper.getConnectionString(), 5);
  });

  afterEach(async () => {
    await repository.close();
  });

  describe('Database Schema Compatibility', () => {
    it('should connect to database without errors', async () => {
      // This test verifies the repository can connect to a real database
      const stats = await repository.getPlayerStats('nonexistent_user');

      expect(stats.userId).toBe('nonexistent_user');
      expect(stats.totalGames).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(0);
      expect(stats.winRate).toBe(0);
      expect(stats.totalTurns).toBe(0);
      expect(stats.averageTurnsPerGame).toBe(0);
    });

    it('should handle queries against empty games table', async () => {
      const leaderboard = await repository.getLeaderboard();
      expect(leaderboard).toEqual([]);

      const history = await repository.getGameHistory('user123');
      expect(history).toEqual([]);
    });
  });

  describe('Real Data Integration', () => {
    beforeEach(async () => {
      // Insert test data directly into the database
      const pool = dbHelper.getPool();

      // Create player profiles
      await pool.query(`
        INSERT INTO player_profiles (user_id, display_name) 
        VALUES 
          ('alice', 'Alice'),
          ('bob', 'Bob'),
          ('charlie', 'Charlie')
      `);

      // Insert completed games
      await pool.query(
        `
        INSERT INTO games (game_id, game_type, lifecycle, winner, state, version, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8),
          ($9, $10, $11, $12, $13, $14, $15, $16),
          ($17, $18, $19, $20, $21, $22, $23, $24)
      `,
        [
          // Game 1: Alice wins against Bob
          'game1',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'alice',
          JSON.stringify({
            gameId: 'game1',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'alice', name: 'Alice', joinedAt: '2024-01-01T10:00:00Z' },
              { id: 'bob', name: 'Bob', joinedAt: '2024-01-01T10:00:00Z' },
            ],
            moveHistory: [
              { playerId: 'alice', timestamp: '2024-01-01T10:01:00Z' },
              { playerId: 'bob', timestamp: '2024-01-01T10:02:00Z' },
              { playerId: 'alice', timestamp: '2024-01-01T10:03:00Z' },
              { playerId: 'bob', timestamp: '2024-01-01T10:04:00Z' },
              { playerId: 'alice', timestamp: '2024-01-01T10:05:00Z' },
            ],
            winner: 'alice',
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:05:00Z',
          }),
          1,
          '2024-01-01T10:00:00Z',
          '2024-01-01T10:05:00Z',

          // Game 2: Bob wins against Alice
          'game2',
          'tic-tac-toe',
          GameLifecycle.COMPLETED,
          'bob',
          JSON.stringify({
            gameId: 'game2',
            gameType: 'tic-tac-toe',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'alice', name: 'Alice', joinedAt: '2024-01-01T11:00:00Z' },
              { id: 'bob', name: 'Bob', joinedAt: '2024-01-01T11:00:00Z' },
            ],
            moveHistory: [
              { playerId: 'alice', timestamp: '2024-01-01T11:01:00Z' },
              { playerId: 'bob', timestamp: '2024-01-01T11:02:00Z' },
              { playerId: 'alice', timestamp: '2024-01-01T11:03:00Z' },
              { playerId: 'bob', timestamp: '2024-01-01T11:04:00Z' },
              { playerId: 'alice', timestamp: '2024-01-01T11:05:00Z' },
              { playerId: 'bob', timestamp: '2024-01-01T11:06:00Z' },
            ],
            winner: 'bob',
            createdAt: '2024-01-01T11:00:00Z',
            updatedAt: '2024-01-01T11:06:00Z',
          }),
          1,
          '2024-01-01T11:00:00Z',
          '2024-01-01T11:06:00Z',

          // Game 3: Draw between Alice and Charlie
          'game3',
          'connect-four',
          GameLifecycle.COMPLETED,
          null,
          JSON.stringify({
            gameId: 'game3',
            gameType: 'connect-four',
            lifecycle: GameLifecycle.COMPLETED,
            players: [
              { id: 'alice', name: 'Alice', joinedAt: '2024-01-01T12:00:00Z' },
              { id: 'charlie', name: 'Charlie', joinedAt: '2024-01-01T12:00:00Z' },
            ],
            moveHistory: [
              { playerId: 'alice', timestamp: '2024-01-01T12:01:00Z' },
              { playerId: 'charlie', timestamp: '2024-01-01T12:02:00Z' },
              { playerId: 'alice', timestamp: '2024-01-01T12:03:00Z' },
              { playerId: 'charlie', timestamp: '2024-01-01T12:04:00Z' },
            ],
            winner: null,
            createdAt: '2024-01-01T12:00:00Z',
            updatedAt: '2024-01-01T12:04:00Z',
          }),
          1,
          '2024-01-01T12:00:00Z',
          '2024-01-01T12:04:00Z',
        ]
      );
    });

    describe('getPlayerStats', () => {
      it('should calculate correct overall stats for Alice', async () => {
        const stats = await repository.getPlayerStats('alice');

        expect(stats.userId).toBe('alice');
        expect(stats.gameType).toBeUndefined();
        expect(stats.totalGames).toBe(3); // Alice played in all 3 games
        expect(stats.wins).toBe(1); // Won game1
        expect(stats.losses).toBe(1); // Lost game2
        expect(stats.draws).toBe(1); // Drew game3
        expect(stats.winRate).toBeCloseTo(0.5, 2); // 1 win / (1 win + 1 loss) = 50%
        expect(stats.totalTurns).toBe(8); // 3 + 3 + 2 moves by Alice across all games
        expect(stats.averageTurnsPerGame).toBeCloseTo(2.67, 2); // 8 / 3 games
      });

      it('should calculate correct overall stats for Bob', async () => {
        const stats = await repository.getPlayerStats('bob');

        expect(stats.userId).toBe('bob');
        expect(stats.totalGames).toBe(2); // Bob played in games 1 and 2
        expect(stats.wins).toBe(1); // Won game2
        expect(stats.losses).toBe(1); // Lost game1
        expect(stats.draws).toBe(0); // No draws
        expect(stats.winRate).toBe(0.5); // 1 win / (1 win + 1 loss) = 50%
        expect(stats.totalTurns).toBe(5); // 2 + 3 moves by Bob in games 1 and 2
        expect(stats.averageTurnsPerGame).toBe(2.5); // 5 / 2 games
      });

      it('should calculate correct game-type-specific stats', async () => {
        const ticTacToeStats = await repository.getPlayerStats('alice', 'tic-tac-toe');

        expect(ticTacToeStats.userId).toBe('alice');
        expect(ticTacToeStats.gameType).toBe('tic-tac-toe');
        expect(ticTacToeStats.totalGames).toBe(2); // Alice played 2 tic-tac-toe games
        expect(ticTacToeStats.wins).toBe(1); // Won game1
        expect(ticTacToeStats.losses).toBe(1); // Lost game2
        expect(ticTacToeStats.draws).toBe(0); // No draws in tic-tac-toe
        expect(ticTacToeStats.winRate).toBe(0.5); // 50% win rate
      });

      it('should return zero stats for player with no games', async () => {
        const stats = await repository.getPlayerStats('nonexistent');

        expect(stats.userId).toBe('nonexistent');
        expect(stats.totalGames).toBe(0);
        expect(stats.wins).toBe(0);
        expect(stats.losses).toBe(0);
        expect(stats.draws).toBe(0);
        expect(stats.winRate).toBe(0);
        expect(stats.totalTurns).toBe(0);
        expect(stats.averageTurnsPerGame).toBe(0);
      });
    });

    describe('getLeaderboard', () => {
      it('should return leaderboard ordered by win rate', async () => {
        const leaderboard = await repository.getLeaderboard();

        expect(leaderboard).toHaveLength(3);

        // Should be ordered by win rate descending
        expect(leaderboard[0].userId).toBe('alice'); // 50% win rate, 3 games
        expect(leaderboard[0].rank).toBe(1);
        expect(leaderboard[0].displayName).toBe('Alice');
        expect(leaderboard[0].winRate).toBeCloseTo(0.5, 2);
        expect(leaderboard[0].totalGames).toBe(3);

        expect(leaderboard[1].userId).toBe('bob'); // 50% win rate, 2 games
        expect(leaderboard[1].rank).toBe(2);
        expect(leaderboard[1].displayName).toBe('Bob');
        expect(leaderboard[1].winRate).toBe(0.5);
        expect(leaderboard[1].totalGames).toBe(2);

        expect(leaderboard[2].userId).toBe('charlie'); // 0% win rate (only draws)
        expect(leaderboard[2].rank).toBe(3);
        expect(leaderboard[2].displayName).toBe('Charlie');
        expect(leaderboard[2].winRate).toBe(0);
        expect(leaderboard[2].totalGames).toBe(1);
      });

      it('should filter leaderboard by game type', async () => {
        const ticTacToeLeaderboard = await repository.getLeaderboard('tic-tac-toe');

        expect(ticTacToeLeaderboard).toHaveLength(2); // Only Alice and Bob played tic-tac-toe
        expect(ticTacToeLeaderboard[0].userId).toBe('alice');
        expect(ticTacToeLeaderboard[1].userId).toBe('bob');
      });

      it('should respect limit parameter', async () => {
        const limitedLeaderboard = await repository.getLeaderboard(undefined, 2);

        expect(limitedLeaderboard).toHaveLength(2);
        expect(limitedLeaderboard[0].userId).toBe('alice');
        expect(limitedLeaderboard[1].userId).toBe('bob');
      });
    });

    describe('getGameHistory', () => {
      it('should return game history for a player', async () => {
        const history = await repository.getGameHistory('alice');

        expect(history).toHaveLength(3);

        // Should be ordered by most recent first (updated_at DESC)
        expect(history[0].gameId).toBe('game3'); // Most recent
        expect(history[1].gameId).toBe('game2');
        expect(history[2].gameId).toBe('game1'); // Oldest
      });

      it('should filter history by game type', async () => {
        const ticTacToeHistory = await repository.getGameHistory('alice', {
          gameType: 'tic-tac-toe',
        });

        expect(ticTacToeHistory).toHaveLength(2);
        expect(ticTacToeHistory[0].gameId).toBe('game2');
        expect(ticTacToeHistory[1].gameId).toBe('game1');
      });

      it('should filter history by lifecycle', async () => {
        const completedHistory = await repository.getGameHistory('alice', {
          lifecycle: GameLifecycle.COMPLETED,
        });

        expect(completedHistory).toHaveLength(3); // All games are completed
      });

      it('should support pagination', async () => {
        const page1 = await repository.getGameHistory('alice', { page: 1, pageSize: 2 });
        const page2 = await repository.getGameHistory('alice', { page: 2, pageSize: 2 });

        expect(page1).toHaveLength(2);
        expect(page2).toHaveLength(1);
        expect(page1[0].gameId).toBe('game3');
        expect(page1[1].gameId).toBe('game2');
        expect(page2[0].gameId).toBe('game1');
      });

      it('should return empty array for player with no games', async () => {
        const history = await repository.getGameHistory('nonexistent');
        expect(history).toEqual([]);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Create repository with invalid connection string
      const badRepository = new PostgresStatsRepository('postgresql://invalid:5432/nonexistent', 1);

      await expect(badRepository.getPlayerStats('user123')).rejects.toThrow();

      await badRepository.close();
    });
  });
});
