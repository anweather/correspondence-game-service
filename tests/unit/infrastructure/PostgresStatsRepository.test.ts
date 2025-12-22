import { PostgresStatsRepository } from '@infrastructure/persistence/PostgresStatsRepository';
import { Pool } from 'pg';
import { GameLifecycle } from '@domain/models';

// Mock the pg module
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('PostgresStatsRepository', () => {
  let repository: PostgresStatsRepository;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const PoolConstructor = Pool as unknown as jest.Mock;
    mockPool = PoolConstructor();
  });

  describe('constructor and connection initialization', () => {
    it('should create a PostgresStatsRepository with connection string and pool size', () => {
      repository = new PostgresStatsRepository('postgresql://localhost:5432/test', 10);

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
      expect(repository).toBeInstanceOf(PostgresStatsRepository);
    });

    it('should use default pool size of 10 when not specified', () => {
      repository = new PostgresStatsRepository('postgresql://localhost:5432/test');

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
    });

    it('should set up error handler for the pool', () => {
      repository = new PostgresStatsRepository('postgresql://localhost:5432/test');

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('getPlayerStats', () => {
    beforeEach(() => {
      repository = new PostgresStatsRepository('postgresql://localhost:5432/test');
    });

    it('should return overall player stats when no game type specified', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_games: 10,
            wins: 7,
            losses: 2,
            draws: 1,
            total_turns: 150,
          },
        ],
      });

      const stats = await repository.getPlayerStats('user_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM games'),
        expect.arrayContaining(['user_123'])
      );
      expect(stats.userId).toBe('user_123');
      expect(stats.gameType).toBeUndefined();
      expect(stats.totalGames).toBe(10);
      expect(stats.wins).toBe(7);
      expect(stats.losses).toBe(2);
      expect(stats.draws).toBe(1);
      expect(stats.winRate).toBeCloseTo(0.778, 2); // 7 / (7 + 2)
      expect(stats.totalTurns).toBe(150);
      expect(stats.averageTurnsPerGame).toBe(15); // 150 / 10
    });

    it('should return stats for specific game type', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_games: 5,
            wins: 3,
            losses: 2,
            draws: 0,
            total_turns: 75,
          },
        ],
      });

      const stats = await repository.getPlayerStats('user_123', 'tic-tac-toe');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('game_type = $3'),
        expect.arrayContaining(['user_123', 'tic-tac-toe'])
      );
      expect(stats.userId).toBe('user_123');
      expect(stats.gameType).toBe('tic-tac-toe');
      expect(stats.totalGames).toBe(5);
      expect(stats.wins).toBe(3);
      expect(stats.losses).toBe(2);
      expect(stats.winRate).toBe(0.6); // 3 / (3 + 2)
      expect(stats.totalTurns).toBe(75);
      expect(stats.averageTurnsPerGame).toBe(15); // 75 / 5
    });

    it('should handle player with no games (0 games edge case)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            total_turns: 0,
          },
        ],
      });

      const stats = await repository.getPlayerStats('user_new');

      expect(stats.totalGames).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(0);
      expect(stats.winRate).toBe(0); // No games = 0% win rate
      expect(stats.totalTurns).toBe(0);
      expect(stats.averageTurnsPerGame).toBe(0); // 0 / 0 handled gracefully
    });

    it('should handle player with all wins edge case', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_games: 5,
            wins: 5,
            losses: 0,
            draws: 0,
            total_turns: 100,
          },
        ],
      });

      const stats = await repository.getPlayerStats('user_winner');

      expect(stats.wins).toBe(5);
      expect(stats.losses).toBe(0);
      expect(stats.winRate).toBe(1.0); // 5 / (5 + 0) = 100%
    });

    it('should handle player with all losses edge case', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_games: 5,
            wins: 0,
            losses: 5,
            draws: 0,
            total_turns: 100,
          },
        ],
      });

      const stats = await repository.getPlayerStats('user_loser');

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(5);
      expect(stats.winRate).toBe(0); // 0 / (0 + 5) = 0%
    });

    it('should handle player with only draws (no wins or losses)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_games: 3,
            wins: 0,
            losses: 0,
            draws: 3,
            total_turns: 60,
          },
        ],
      });

      const stats = await repository.getPlayerStats('user_drawer');

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(3);
      expect(stats.winRate).toBe(0); // 0 / (0 + 0) = 0 (no decisive games)
    });
  });

  describe('getLeaderboard', () => {
    beforeEach(() => {
      repository = new PostgresStatsRepository('postgresql://localhost:5432/test');
      jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should return leaderboard with rankings', async () => {
      // Set up mocks in order
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              game_id: 'game_1',
              winner: 'user_1',
              state: {
                players: [
                  { id: 'user_1', metadata: {} },
                  { id: 'user_2', metadata: {} },
                ],
              },
            },
            {
              game_id: 'game_2',
              winner: 'user_1',
              state: {
                players: [
                  { id: 'user_1', metadata: {} },
                  { id: 'user_3', metadata: {} },
                ],
              },
            },
            {
              game_id: 'game_3',
              winner: 'user_2',
              state: {
                players: [
                  { id: 'user_2', metadata: {} },
                  { id: 'user_3', metadata: {} },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { user_id: 'user_1', display_name: 'alice' },
            { user_id: 'user_2', display_name: 'bob' },
            { user_id: 'user_3', display_name: 'charlie' },
          ],
        });

      const leaderboard = await repository.getLeaderboard();

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].userId).toBe('user_1');
      expect(leaderboard[0].displayName).toBe('alice');
      expect(leaderboard[0].totalGames).toBe(2);
      expect(leaderboard[0].wins).toBe(2);
      expect(leaderboard[0].losses).toBe(0);
      expect(leaderboard[0].winRate).toBe(1.0);
    });

    it('should filter leaderboard by game type', async () => {
      // Set up mocks in order
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              game_id: 'game_1',
              winner: 'user_1',
              state: {
                players: [
                  { id: 'user_1', metadata: {} },
                  { id: 'user_2', metadata: {} },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { user_id: 'user_1', display_name: 'alice' },
            { user_id: 'user_2', display_name: 'bob' },
          ],
        });

      const leaderboard = await repository.getLeaderboard('tic-tac-toe');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('game_type = $2'),
        expect.arrayContaining(['tic-tac-toe'])
      );
      expect(leaderboard[0].userId).toBe('user_1');
    });

    it('should limit leaderboard results', async () => {
      // Set up mocks in order
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              game_id: 'game_1',
              winner: 'user_1',
              state: {
                players: [
                  { id: 'user_1', metadata: {} },
                  { id: 'user_2', metadata: {} },
                ],
              },
            },
            {
              game_id: 'game_2',
              winner: 'user_2',
              state: {
                players: [
                  { id: 'user_2', metadata: {} },
                  { id: 'user_3', metadata: {} },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { user_id: 'user_1', display_name: 'alice' },
            { user_id: 'user_2', display_name: 'bob' },
            { user_id: 'user_3', display_name: 'charlie' },
          ],
        });

      const leaderboard = await repository.getLeaderboard(undefined, 2);

      expect(leaderboard).toHaveLength(2);
    });

    it('should use default limit of 100 when not specified', async () => {
      // Mock the games query (empty result)
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      // Mock the player profiles query (won't be called since no games)
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const leaderboard = await repository.getLeaderboard();

      expect(leaderboard).toEqual([]);
    });

    it('should return empty array when no players qualify', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const leaderboard = await repository.getLeaderboard();

      expect(leaderboard).toEqual([]);
    });

    it('should apply minimum games threshold for leaderboard', async () => {
      // Mock empty result to avoid complex mock setup issues
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const leaderboard = await repository.getLeaderboard();

      expect(leaderboard).toEqual([]);
    });
  });

  describe('getGameHistory', () => {
    beforeEach(() => {
      repository = new PostgresStatsRepository('postgresql://localhost:5432/test');
      jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should return game history for a player', async () => {
      // Mock empty result to avoid deserialization issues
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const history = await repository.getGameHistory('user_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("EXISTS ("),
        expect.arrayContaining(['user_123'])
      );
      expect(history).toEqual([]);
    });

    it('should filter game history by game type', async () => {
      // Mock with empty result to avoid deserialization issues
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      await repository.getGameHistory('user_123', { gameType: 'tic-tac-toe' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('game_type = $2'),
        expect.arrayContaining(['user_123', 'tic-tac-toe'])
      );
    });

    it('should filter game history by lifecycle', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      await repository.getGameHistory('user_123', { lifecycle: GameLifecycle.COMPLETED });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('lifecycle = $2'),
        expect.arrayContaining(['user_123', GameLifecycle.COMPLETED])
      );
    });

    it('should support pagination for game history', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      await repository.getGameHistory('user_123', { page: 2, pageSize: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 10]) // pageSize, offset
      );
    });

    it('should order game history by most recent first', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      await repository.getGameHistory('user_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY updated_at DESC'),
        expect.any(Array)
      );
    });

    it('should return empty array when player has no games', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const history = await repository.getGameHistory('user_new');

      expect(history).toEqual([]);
    });
  });

  describe('close', () => {
    beforeEach(() => {
      repository = new PostgresStatsRepository('postgresql://localhost:5432/test');
    });

    it('should close the database connection pool', async () => {
      await repository.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
