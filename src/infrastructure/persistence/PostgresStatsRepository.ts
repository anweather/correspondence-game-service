/**
 * PostgreSQL implementation of StatsRepository
 * Provides player statistics and leaderboard functionality
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
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
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
   * Get player statistics
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
        ) as total_turns
      FROM games
      WHERE state->'players' @> $3::jsonb
        AND lifecycle = $2
    `;

    const params: any[] = [userId, GameLifecycle.COMPLETED, JSON.stringify([{ id: userId }])];

    if (gameType) {
      query += ' AND game_type = $4';
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

      // Player stats retrieved successfully

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
   * Get leaderboard with rankings
   * @param gameType - Optional game type filter
   * @param limit - Maximum number of entries (default 100)
   * @returns Leaderboard entries with rankings
   */
  async getLeaderboard(gameType?: string, limit: number = 100): Promise<LeaderboardEntry[]> {
    const logger = getLogger();

    // First CTE: Expand players from each game
    let query = `
      WITH player_games AS (
        SELECT 
          jsonb_array_elements(state->'players')->>'id' as user_id,
          winner,
          lifecycle
        FROM games
        WHERE lifecycle = $1
    `;

    const params: any[] = [GameLifecycle.COMPLETED];
    let paramIndex = 2;

    if (gameType) {
      query += ` AND game_type = $${paramIndex}`;
      params.push(gameType);
      paramIndex++;
    }

    // Second CTE: Aggregate stats per player
    query += `
      ),
      player_stats AS (
        SELECT 
          user_id,
          COUNT(*) as total_games,
          SUM(CASE WHEN winner = user_id THEN 1 ELSE 0 END) as wins,
          SUM(CASE 
            WHEN winner IS NOT NULL 
            AND winner != user_id 
            THEN 1 
            ELSE 0 
          END) as losses
        FROM player_games
        GROUP BY user_id
        HAVING COUNT(*) >= 1
      )
      SELECT 
        ps.user_id,
        pp.display_name,
        ps.total_games::integer,
        ps.wins::integer,
        ps.losses::integer,
        CASE 
          WHEN (ps.wins + ps.losses) > 0 
          THEN ps.wins::float / (ps.wins + ps.losses)::float
          ELSE 0
        END as win_rate
      FROM player_stats ps
      JOIN player_profiles pp ON ps.user_id = pp.user_id
      ORDER BY win_rate DESC, total_games DESC
      LIMIT $${paramIndex}
    `;

    params.push(limit);

    try {
      const result = await this.pool.query(query, params);

      const leaderboard: LeaderboardEntry[] = result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        displayName: row.display_name,
        totalGames: row.total_games,
        wins: row.wins,
        losses: row.losses,
        winRate: parseFloat(row.win_rate),
      }));

      // Leaderboard retrieved successfully

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
   * @returns Array of game states
   */
  async getGameHistory(userId: string, filters: GameHistoryFilters = {}): Promise<GameState[]> {
    const logger = getLogger();

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT * FROM games
      WHERE state->'players' @> $1::jsonb
    `;

    const params: any[] = [JSON.stringify([{ id: userId }])];
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

      // Game history retrieved successfully

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

    // Reconstruct Date objects
    state.createdAt = new Date(state.createdAt);
    state.updatedAt = new Date(state.updatedAt);

    // Reconstruct Date objects in players
    state.players = state.players.map((player) => ({
      ...player,
      joinedAt: new Date(player.joinedAt),
    }));

    // Reconstruct Date objects in moveHistory
    state.moveHistory = state.moveHistory.map((move) => ({
      ...move,
      timestamp: new Date(move.timestamp),
    }));

    return state;
  }

  /**
   * Closes all connections in the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
