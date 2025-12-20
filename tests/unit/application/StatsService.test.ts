/**
 * Unit tests for StatsService
 * Tests statistics calculation, leaderboard ranking, and game history filtering
 */

import { StatsService } from '@application/services/StatsService';
import {
  PlayerStats,
  LeaderboardEntry,
  GameHistoryFilters,
} from '@infrastructure/persistence/PostgresStatsRepository';
import { GameState, GameLifecycle } from '@domain/models';

// Mock stats repository
interface MockStatsRepository {
  getPlayerStats: jest.Mock;
  getLeaderboard: jest.Mock;
  getGameHistory: jest.Mock;
}

describe('StatsService', () => {
  let statsService: StatsService;
  let mockStatsRepository: MockStatsRepository;

  beforeEach(() => {
    mockStatsRepository = {
      getPlayerStats: jest.fn(),
      getLeaderboard: jest.fn(),
      getGameHistory: jest.fn(),
    };

    statsService = new StatsService(mockStatsRepository as any);
  });

  describe('getPlayerStats', () => {
    it('should retrieve player stats from repository', async () => {
      const userId = 'user123';
      const expectedStats: PlayerStats = {
        userId,
        totalGames: 10,
        wins: 7,
        losses: 3,
        draws: 0,
        winRate: 0.7,
        totalTurns: 100,
        averageTurnsPerGame: 10,
        aiGames: 2,
      };

      mockStatsRepository.getPlayerStats.mockResolvedValue(expectedStats);

      const result = await statsService.getPlayerStats(userId);

      expect(result).toEqual(expectedStats);
      expect(mockStatsRepository.getPlayerStats).toHaveBeenCalledWith(userId, undefined);
    });

    it('should retrieve player stats for specific game type', async () => {
      const userId = 'user123';
      const gameType = 'tic-tac-toe';
      const expectedStats: PlayerStats = {
        userId,
        gameType,
        totalGames: 5,
        wins: 4,
        losses: 1,
        draws: 0,
        winRate: 0.8,
        totalTurns: 50,
        averageTurnsPerGame: 10,
        aiGames: 1,
      };

      mockStatsRepository.getPlayerStats.mockResolvedValue(expectedStats);

      const result = await statsService.getPlayerStats(userId, gameType);

      expect(result).toEqual(expectedStats);
      expect(mockStatsRepository.getPlayerStats).toHaveBeenCalledWith(userId, gameType);
    });

    it('should handle edge case: no games played', async () => {
      const userId = 'user123';
      const expectedStats: PlayerStats = {
        userId,
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalTurns: 0,
        averageTurnsPerGame: 0,
        aiGames: 0,
      };

      mockStatsRepository.getPlayerStats.mockResolvedValue(expectedStats);

      const result = await statsService.getPlayerStats(userId);

      expect(result).toEqual(expectedStats);
      expect(result.winRate).toBe(0);
      expect(result.averageTurnsPerGame).toBe(0);
    });

    it('should handle edge case: all wins', async () => {
      const userId = 'user123';
      const expectedStats: PlayerStats = {
        userId,
        totalGames: 5,
        wins: 5,
        losses: 0,
        draws: 0,
        winRate: 1.0,
        totalTurns: 50,
        averageTurnsPerGame: 10,
        aiGames: 0,
      };

      mockStatsRepository.getPlayerStats.mockResolvedValue(expectedStats);

      const result = await statsService.getPlayerStats(userId);

      expect(result).toEqual(expectedStats);
      expect(result.winRate).toBe(1.0);
    });

    it('should handle edge case: all losses', async () => {
      const userId = 'user123';
      const expectedStats: PlayerStats = {
        userId,
        totalGames: 5,
        wins: 0,
        losses: 5,
        draws: 0,
        winRate: 0,
        totalTurns: 50,
        averageTurnsPerGame: 10,
        aiGames: 0,
      };

      mockStatsRepository.getPlayerStats.mockResolvedValue(expectedStats);

      const result = await statsService.getPlayerStats(userId);

      expect(result).toEqual(expectedStats);
      expect(result.winRate).toBe(0);
    });

    it('should handle edge case: only draws', async () => {
      const userId = 'user123';
      const expectedStats: PlayerStats = {
        userId,
        totalGames: 3,
        wins: 0,
        losses: 0,
        draws: 3,
        winRate: 0,
        totalTurns: 30,
        averageTurnsPerGame: 10,
        aiGames: 0,
      };

      mockStatsRepository.getPlayerStats.mockResolvedValue(expectedStats);

      const result = await statsService.getPlayerStats(userId);

      expect(result).toEqual(expectedStats);
      expect(result.winRate).toBe(0);
    });
  });

  describe('getLeaderboard', () => {
    it('should retrieve leaderboard from repository', async () => {
      const expectedLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'player1',
          totalGames: 20,
          wins: 18,
          losses: 2,
          winRate: 0.9,
          aiGames: 5,
        },
        {
          rank: 2,
          userId: 'user2',
          displayName: 'player2',
          totalGames: 15,
          wins: 12,
          losses: 3,
          winRate: 0.8,
          aiGames: 3,
        },
      ];

      mockStatsRepository.getLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await statsService.getLeaderboard();

      expect(result).toEqual(expectedLeaderboard);
      expect(mockStatsRepository.getLeaderboard).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should retrieve leaderboard for specific game type', async () => {
      const gameType = 'tic-tac-toe';
      const expectedLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'player1',
          totalGames: 10,
          wins: 9,
          losses: 1,
          winRate: 0.9,
          aiGames: 2,
        },
      ];

      mockStatsRepository.getLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await statsService.getLeaderboard(gameType);

      expect(result).toEqual(expectedLeaderboard);
      expect(mockStatsRepository.getLeaderboard).toHaveBeenCalledWith(gameType, undefined);
    });

    it('should retrieve leaderboard with custom limit', async () => {
      const limit = 50;
      const expectedLeaderboard: LeaderboardEntry[] = [];

      mockStatsRepository.getLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await statsService.getLeaderboard(undefined, limit);

      expect(result).toEqual(expectedLeaderboard);
      expect(mockStatsRepository.getLeaderboard).toHaveBeenCalledWith(undefined, limit);
    });

    it('should verify leaderboard is ordered by win rate descending', async () => {
      const expectedLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'player1',
          totalGames: 10,
          wins: 9,
          losses: 1,
          winRate: 0.9,
          aiGames: 1,
        },
        {
          rank: 2,
          userId: 'user2',
          displayName: 'player2',
          totalGames: 10,
          wins: 8,
          losses: 2,
          winRate: 0.8,
          aiGames: 2,
        },
        {
          rank: 3,
          userId: 'user3',
          displayName: 'player3',
          totalGames: 10,
          wins: 7,
          losses: 3,
          winRate: 0.7,
          aiGames: 0,
        },
      ];

      mockStatsRepository.getLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await statsService.getLeaderboard();

      // Verify ordering
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].winRate).toBeGreaterThanOrEqual(result[i + 1].winRate);
      }
    });

    it('should verify ranks are sequential starting from 1', async () => {
      const expectedLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'player1',
          totalGames: 10,
          wins: 9,
          losses: 1,
          winRate: 0.9,
          aiGames: 1,
        },
        {
          rank: 2,
          userId: 'user2',
          displayName: 'player2',
          totalGames: 10,
          wins: 8,
          losses: 2,
          winRate: 0.8,
          aiGames: 2,
        },
        {
          rank: 3,
          userId: 'user3',
          displayName: 'player3',
          totalGames: 10,
          wins: 7,
          losses: 3,
          winRate: 0.7,
          aiGames: 0,
        },
      ];

      mockStatsRepository.getLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await statsService.getLeaderboard();

      // Verify ranks are sequential
      result.forEach((entry, index) => {
        expect(entry.rank).toBe(index + 1);
      });
    });
  });

  describe('getGameHistory', () => {
    const createMockGame = (
      gameId: string,
      gameType: string,
      lifecycle: GameLifecycle
    ): GameState => ({
      gameId,
      gameType,
      lifecycle,
      players: [
        { id: 'user123', name: 'Player 1', joinedAt: new Date() },
        { id: 'user456', name: 'Player 2', joinedAt: new Date() },
      ],
      currentPlayerIndex: 0,
      phase: 'main',
      moveHistory: [],
      board: {
        spaces: [],
        metadata: {},
      },
      metadata: {},
      winner: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should retrieve game history from repository', async () => {
      const userId = 'user123';
      const expectedGames: GameState[] = [
        createMockGame('game1', 'tic-tac-toe', GameLifecycle.COMPLETED),
        createMockGame('game2', 'tic-tac-toe', GameLifecycle.ACTIVE),
      ];

      mockStatsRepository.getGameHistory.mockResolvedValue(expectedGames);

      const result = await statsService.getGameHistory(userId);

      expect(result).toEqual(expectedGames);
      expect(mockStatsRepository.getGameHistory).toHaveBeenCalledWith(userId, {});
    });

    it('should filter game history by game type', async () => {
      const userId = 'user123';
      const filters: GameHistoryFilters = { gameType: 'tic-tac-toe' };
      const expectedGames: GameState[] = [
        createMockGame('game1', 'tic-tac-toe', GameLifecycle.COMPLETED),
      ];

      mockStatsRepository.getGameHistory.mockResolvedValue(expectedGames);

      const result = await statsService.getGameHistory(userId, filters);

      expect(result).toEqual(expectedGames);
      expect(mockStatsRepository.getGameHistory).toHaveBeenCalledWith(userId, filters);
    });

    it('should filter game history by lifecycle', async () => {
      const userId = 'user123';
      const filters: GameHistoryFilters = { lifecycle: GameLifecycle.COMPLETED };
      const expectedGames: GameState[] = [
        createMockGame('game1', 'tic-tac-toe', GameLifecycle.COMPLETED),
      ];

      mockStatsRepository.getGameHistory.mockResolvedValue(expectedGames);

      const result = await statsService.getGameHistory(userId, filters);

      expect(result).toEqual(expectedGames);
      expect(mockStatsRepository.getGameHistory).toHaveBeenCalledWith(userId, filters);
    });

    it('should support pagination', async () => {
      const userId = 'user123';
      const filters: GameHistoryFilters = { page: 2, pageSize: 10 };
      const expectedGames: GameState[] = [
        createMockGame('game11', 'tic-tac-toe', GameLifecycle.COMPLETED),
      ];

      mockStatsRepository.getGameHistory.mockResolvedValue(expectedGames);

      const result = await statsService.getGameHistory(userId, filters);

      expect(result).toEqual(expectedGames);
      expect(mockStatsRepository.getGameHistory).toHaveBeenCalledWith(userId, filters);
    });

    it('should combine multiple filters', async () => {
      const userId = 'user123';
      const filters: GameHistoryFilters = {
        gameType: 'tic-tac-toe',
        lifecycle: GameLifecycle.COMPLETED,
        page: 1,
        pageSize: 20,
      };
      const expectedGames: GameState[] = [
        createMockGame('game1', 'tic-tac-toe', GameLifecycle.COMPLETED),
      ];

      mockStatsRepository.getGameHistory.mockResolvedValue(expectedGames);

      const result = await statsService.getGameHistory(userId, filters);

      expect(result).toEqual(expectedGames);
      expect(mockStatsRepository.getGameHistory).toHaveBeenCalledWith(userId, filters);
    });

    it('should return empty array when no games match filters', async () => {
      const userId = 'user123';
      const filters: GameHistoryFilters = { gameType: 'nonexistent' };

      mockStatsRepository.getGameHistory.mockResolvedValue([]);

      const result = await statsService.getGameHistory(userId, filters);

      expect(result).toEqual([]);
      expect(mockStatsRepository.getGameHistory).toHaveBeenCalledWith(userId, filters);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getPlayerStats', async () => {
      const userId = 'user123';
      const error = new Error('Database error');

      mockStatsRepository.getPlayerStats.mockRejectedValue(error);

      await expect(statsService.getPlayerStats(userId)).rejects.toThrow('Database error');
    });

    it('should propagate errors from getLeaderboard', async () => {
      const error = new Error('Database error');

      mockStatsRepository.getLeaderboard.mockRejectedValue(error);

      await expect(statsService.getLeaderboard()).rejects.toThrow('Database error');
    });

    it('should propagate errors from getGameHistory', async () => {
      const userId = 'user123';
      const error = new Error('Database error');

      mockStatsRepository.getGameHistory.mockRejectedValue(error);

      await expect(statsService.getGameHistory(userId)).rejects.toThrow('Database error');
    });
  });
});
