/**
 * StatsService
 * Application service for managing player statistics and leaderboards
 */

import { GameState } from '@domain/models';
import {
  PlayerStats,
  LeaderboardEntry,
  GameHistoryFilters,
  PostgresStatsRepository,
} from '@infrastructure/persistence/PostgresStatsRepository';
import { getLogger } from '@infrastructure/logging/Logger';

export class StatsService {
  constructor(private statsRepository: PostgresStatsRepository) {}

  /**
   * Get player statistics
   * @param userId - User ID to get stats for
   * @param gameType - Optional game type filter
   * @returns Player statistics including win rate and average turns
   */
  async getPlayerStats(userId: string, gameType?: string): Promise<PlayerStats> {
    const logger = getLogger();

    logger.debug('Getting player stats', { userId, gameType });

    try {
      const stats = await this.statsRepository.getPlayerStats(userId, gameType);

      logger.info('Retrieved player stats', {
        userId,
        gameType,
        totalGames: stats.totalGames,
        winRate: stats.winRate,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get player stats', {
        userId,
        gameType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get leaderboard with rankings
   * @param gameType - Optional game type filter
   * @param limit - Maximum number of entries (default 100)
   * @returns Leaderboard entries ordered by win rate
   */
  async getLeaderboard(gameType?: string, limit?: number): Promise<LeaderboardEntry[]> {
    const logger = getLogger();

    logger.debug('Getting leaderboard', { gameType, limit });

    try {
      const leaderboard = await this.statsRepository.getLeaderboard(gameType, limit);

      logger.info('Retrieved leaderboard', {
        gameType,
        limit,
        entries: leaderboard.length,
      });

      return leaderboard;
    } catch (error) {
      logger.error('Failed to get leaderboard', {
        gameType,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get game history for a player
   * @param userId - User ID to get history for
   * @param filters - Optional filters for game type, lifecycle, pagination
   * @returns Array of game states ordered by most recent first
   */
  async getGameHistory(userId: string, filters: GameHistoryFilters = {}): Promise<GameState[]> {
    const logger = getLogger();

    logger.debug('Getting game history', { userId, filters });

    try {
      const games = await this.statsRepository.getGameHistory(userId, filters);

      logger.info('Retrieved game history', {
        userId,
        filters,
        count: games.length,
      });

      return games;
    } catch (error) {
      logger.error('Failed to get game history', {
        userId,
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
