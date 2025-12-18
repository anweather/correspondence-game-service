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

    try {
      const stats = await this.statsRepository.getPlayerStats(userId, gameType);
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

    try {
      const leaderboard = await this.statsRepository.getLeaderboard(gameType, limit);
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

    try {
      const games = await this.statsRepository.getGameHistory(userId, filters);
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
