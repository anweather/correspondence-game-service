/**
 * PostgreSQL implementation of StatsRepository
 * Provides player statistics and leaderboard functionality with AI player support
 */

import { Pool, PoolConfig } from 'pg';
import { GameState, GameLifecycle } from '@domain/models';
import { getLogger } from '../logging/Logger';

export interface PlayerStats {
  userId: string;
  gameType?: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalTurns: number;
  averageTurnsPerGame: number;
  aiGames?: number; // Number of games that included AI players
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  aiGames?: number; // Number of games that included AI players
}

export interface GameHistoryFilters {
  gameType?: string;
  lifecycle?: GameLifecycle;
  page?: number;
  pageSize?: number;
}

interface DatabaseRow {
  game_id: string;
  game_type: string;
  lifecycle: string;
  winner: string | null;
  state: string | GameState;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export class PostgresStatsRepository {
  private pool: Pool;

  constructor(connectionString: string, poolSize: number = 10) {
    const poolConfig: PoolConfig = {
      connectionString,
      max: poolSize,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err) => {
      const logger = getLogger();
      logger.error('Unexpected error on idle database client', {
        error: err.message,
        stack: err.stack,
      });
    });
  }

  /**
   * Get player statistics (excludes AI players from stats)
   * @param userId - User ID to get stats for
   * @param gameType - Optional game type filter
   * @returns Player statistics
   */
  async getPlayerStats(userId: string, gameType?: string): Promise<PlayerStats> {
    const logger = getLogger();

    let query = `
      SELECT 
        COUNT(*) as total_games,
        SUM(CASE WHEN winner = $1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner IS NOT NULL AND winner != $1 AND lifecycle = $2 THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN winner IS NULL AND lifecycle = $2 THEN 1 ELSE 0 END) as draws,
        SUM(
          (SELECT COUNT(*) 
           FROM jsonb_array_elements(state->'moveHistory') AS move 
           WHERE move->>'playerId' = $1)
        ) as total_turns,
        SUM(
          CASE WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements(state->'players') AS player 
            WHERE player->'metadata'->>'isAI' = 'true'
          ) THEN 1 ELSE 0 END
        ) as ai_games
      FROM games
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(state->'players') AS player 
        WHERE player->>'id' = $1
      )
        AND lifecycle = $2
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(state->'players') AS player 
          WHERE player->>'id' = $1 AND player->'metadata'->>'isAI' = 'true'
        )
    `;

    const params: any[] = [userId, GameLifecycle.COMPLETED];

    if (gameType) {
      query += ' AND game_type = $3';
      params.push(gameType);
    }

    try {
      const result = await this.pool.query(query, params);
      const row = result.rows[0];

      const totalGames = parseInt(row.total_games, 10) || 0;
      const wins = parseInt(row.wins, 10) || 0;
      const losses = parseInt(row.losses, 10) || 0;
      const draws = parseInt(row.draws, 10) || 0;
      const totalTurns = parseInt(row.total_turns, 10) || 0;
      const aiGames = parseInt(row.ai_games, 10) || 0;

      // Calculate win rate: wins / (wins + losses)
      // Handle edge cases: no games, only draws, etc.
      let winRate = 0;
      if (wins + losses > 0) {
        winRate = wins / (wins + losses);
      }

      // Calculate average turns per game
      let averageTurnsPerGame = 0;
      if (totalGames > 0) {
        averageTurnsPerGame = totalTurns / totalGames;
      }

      return {
        userId,
        gameType,
        totalGames,
        wins,
        losses,
        draws,
        winRate,
        totalTurns,
        averageTurnsPerGame,
        aiGames,
      };
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
   * Get leaderboard with rankings (excludes AI players from leaderboard)
   * @param gameType - Optional game type filter
   * @param limit - Maximum number of entries (default 100)
   * @returns Leaderboard entries with rankings
   */
  async getLeaderboard(gameType?: string, limit: number = 100): Promise<LeaderboardEntry[]> {
    const logger = getLogger();

    // Simplified approach: Get all completed games and process in application layer
    let baseQuery = `
      SELECT 
        game_id,
        winner,
        state
      FROM games
      WHERE lifecycle = $1
    `;

    const params: any[] = [GameLifecycle.COMPLETED];
    let paramIndex = 2;

    if (gameType) {
      baseQuery += ` AND game_type = $${paramIndex}`;
      params.push(gameType);
      paramIndex++;
    }

    try {
      const result = await this.pool.query(baseQuery, params);

      // Process games to build player stats
      const playerStats = new Map<
        string,
        {
          totalGames: number;
          wins: number;
          losses: number;
          aiGames: number;
        }
      >();

      for (const row of result.rows) {
        const state = typeof row.state === 'string' ? JSON.parse(row.state) : row.state;
        const hasAI = state.players.some((p: any) => p.metadata?.isAI === true);

        // Only count human players
        const humanPlayers = state.players.filter((p: any) => !p.metadata?.isAI);

        for (const player of humanPlayers) {
          const playerId = player.id;

          if (!playerStats.has(playerId)) {
            playerStats.set(playerId, { totalGames: 0, wins: 0, losses: 0, aiGames: 0 });
          }

          const stats = playerStats.get(playerId)!;
          stats.totalGames++;

          if (hasAI) {
            stats.aiGames++;
          }

          if (row.winner === playerId) {
            stats.wins++;
          } else if (row.winner && row.winner !== playerId) {
            stats.losses++;
          }
        }
      }

      // Get display names for players
      const playerIds = Array.from(playerStats.keys());
      if (playerIds.length === 0) {
        return [];
      }

      const profileQuery = `
        SELECT user_id, display_name 
        FROM player_profiles 
        WHERE user_id = ANY($1)
      `;

      const profileResult = await this.pool.query(profileQuery, [playerIds]);
      const displayNames = new Map(
        profileResult.rows.map((row) => [row.user_id, row.display_name])
      );

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = [];

      for (const [userId, stats] of playerStats.entries()) {
        const winRate =
          stats.wins + stats.losses > 0 ? stats.wins / (stats.wins + stats.losses) : 0;

        entries.push({
          rank: 0, // Will be set after sorting
          userId,
          displayName: displayNames.get(userId) || 'Unknown',
          totalGames: stats.totalGames,
          wins: stats.wins,
          losses: stats.losses,
          winRate,
          aiGames: stats.aiGames,
        });
      }

      // Sort by win rate descending, then by total games descending
      entries.sort((a, b) => {
        if (a.winRate !== b.winRate) {
          return b.winRate - a.winRate;
        }
        return b.totalGames - a.totalGames;
      });

      // Set ranks and apply limit
      const limitedEntries = entries.slice(0, limit);
      limitedEntries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return limitedEntries;
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
   * @returns Array of game states
   */
  async getGameHistory(userId: string, filters: GameHistoryFilters = {}): Promise<GameState[]> {
    const logger = getLogger();

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT * FROM games
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(state->'players') AS player 
        WHERE player->>'id' = $1
      )
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters.gameType) {
      query += ` AND game_type = $${paramIndex}`;
      params.push(filters.gameType);
      paramIndex++;
    }

    if (filters.lifecycle) {
      query += ` AND lifecycle = $${paramIndex}`;
      params.push(filters.lifecycle);
      paramIndex++;
    }

    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    try {
      const result = await this.pool.query(query, params);

      const games = result.rows.map((row) => this.deserializeGameState(row));

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

  /**
   * Deserializes database row to GameState
   */
  private deserializeGameState(row: DatabaseRow): GameState {
    const state = (typeof row.state === 'string' ? JSON.parse(row.state) : row.state) as GameState;

    // Handle case where state might be null or undefined
    if (!state) {
      throw new Error('Game state is null or undefined');
    }

    // Reconstruct Date objects
    if (state.createdAt) {
      state.createdAt = new Date(state.createdAt);
    }
    if (state.updatedAt) {
      state.updatedAt = new Date(state.updatedAt);
    }

    // Reconstruct Date objects in players
    if (state.players && Array.isArray(state.players)) {
      state.players = state.players.map((player) => ({
        ...player,
        joinedAt: player.joinedAt ? new Date(player.joinedAt) : player.joinedAt,
      }));
    }

    // Reconstruct Date objects in moveHistory
    if (state.moveHistory && Array.isArray(state.moveHistory)) {
      state.moveHistory = state.moveHistory.map((move) => ({
        ...move,
        timestamp: move.timestamp ? new Date(move.timestamp) : move.timestamp,
      }));
    }

    return state;
  }

  /**
   * Closes all connections in the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
