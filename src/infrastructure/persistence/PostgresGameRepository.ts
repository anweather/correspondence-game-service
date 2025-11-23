/**
 * PostgreSQL implementation of GameRepository
 * Uses pg (node-postgres) for database connectivity with connection pooling
 */

import { Pool, PoolConfig } from 'pg';
import { GameRepository, GameFilters, PaginatedResult } from '@domain/interfaces';
import { GameState } from '@domain/models';
import { ConcurrencyError, GameNotFoundError } from '@domain/errors';
import { getLogger } from '../logging/Logger';

interface DatabaseRow {
  game_id: string;
  game_type: string;
  lifecycle: string;
  state: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export class PostgresGameRepository implements GameRepository {
  private pool: Pool;

  constructor(connectionString: string, poolSize: number = 10) {
    const poolConfig: PoolConfig = {
      connectionString,
      max: poolSize,
      idleTimeoutMillis: 10000, // 10 seconds
      connectionTimeoutMillis: 30000, // 30 seconds
    };

    this.pool = new Pool(poolConfig);

    // Set up error handler for the pool
    this.pool.on('error', (err) => {
      const logger = getLogger();
      logger.error('Unexpected error on idle database client', {
        error: err.message,
        stack: err.stack,
      });
    });
  }

  /**
   * Serializes GameState to database row format
   * Extracts indexed fields and stores complete state as JSONB
   */
  private serializeGameState(state: GameState): DatabaseRow {
    return {
      game_id: state.gameId,
      game_type: state.gameType,
      lifecycle: state.lifecycle,
      state: JSON.stringify(state),
      version: state.version,
      created_at: state.createdAt,
      updated_at: state.updatedAt,
    };
  }

  /**
   * Deserializes database row to GameState
   * Reconstructs Date objects from ISO strings
   */
  private deserializeGameState(row: DatabaseRow): GameState {
    const state = JSON.parse(row.state) as GameState;

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
   * Save a new game state
   */
  async save(state: GameState): Promise<void> {
    const logger = getLogger();
    const row = this.serializeGameState(state);

    const query = `
      INSERT INTO games (game_id, game_type, lifecycle, state, version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    try {
      await this.pool.query(query, [
        row.game_id,
        row.game_type,
        row.lifecycle,
        row.state,
        row.version,
        row.created_at,
        row.updated_at,
      ]);
      logger.debug('Game saved to database', {
        gameId: state.gameId,
        gameType: state.gameType,
      });
    } catch (error) {
      logger.error('Failed to save game to database', {
        gameId: state.gameId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find a game by its ID
   */
  async findById(gameId: string): Promise<GameState | null> {
    const query = 'SELECT * FROM games WHERE game_id = $1';
    const result = await this.pool.query(query, [gameId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserializeGameState(result.rows[0]);
  }

  /**
   * Find all games with optional filters and pagination
   */
  async findAll(filters: GameFilters): Promise<PaginatedResult<GameState>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.lifecycle) {
      conditions.push(`lifecycle = $${paramIndex}`);
      params.push(filters.lifecycle);
      paramIndex++;
    }

    if (filters.gameType) {
      conditions.push(`game_type = $${paramIndex}`);
      params.push(filters.gameType);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM games ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM games
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.pool.query(dataQuery, [...params, pageSize, offset]);

    const items = dataResult.rows.map((row) => this.deserializeGameState(row));
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Find games by player ID with optional filters and pagination
   */
  async findByPlayer(playerId: string, filters: GameFilters): Promise<PaginatedResult<GameState>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let paramIndex = 1;

    // Player filter using JSONB containment
    conditions.push(`state->'players' @> $${paramIndex}::jsonb`);
    params.push(JSON.stringify([{ id: playerId }]));
    paramIndex++;

    if (filters.lifecycle) {
      conditions.push(`lifecycle = $${paramIndex}`);
      params.push(filters.lifecycle);
      paramIndex++;
    }

    if (filters.gameType) {
      conditions.push(`game_type = $${paramIndex}`);
      params.push(filters.gameType);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM games ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM games
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.pool.query(dataQuery, [...params, pageSize, offset]);

    const items = dataResult.rows.map((row) => this.deserializeGameState(row));
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Update an existing game state with optimistic locking
   * @throws ConcurrencyError if version mismatch
   * @throws GameNotFoundError if game not found
   */
  async update(gameId: string, state: GameState, expectedVersion: number): Promise<GameState> {
    const logger = getLogger();
    const row = this.serializeGameState(state);

    const query = `
      UPDATE games
      SET game_type = $1, lifecycle = $2, state = $3, version = $4, updated_at = $5
      WHERE game_id = $6 AND version = $7
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [
        row.game_type,
        row.lifecycle,
        row.state,
        row.version,
        row.updated_at,
        gameId,
        expectedVersion,
      ]);

      if (result.rows.length === 0) {
        // Check if game exists
        const checkQuery = 'SELECT version FROM games WHERE game_id = $1';
        const checkResult = await this.pool.query(checkQuery, [gameId]);

        if (checkResult.rows.length === 0) {
          logger.warn('Game not found for update', { gameId });
          throw new GameNotFoundError(gameId);
        }

        // Game exists but version mismatch
        logger.warn('Concurrency error during game update', {
          gameId,
          expectedVersion,
          currentVersion: checkResult.rows[0].version,
        });
        throw new ConcurrencyError(gameId);
      }

      logger.debug('Game updated in database', {
        gameId,
        newVersion: row.version,
      });

      return this.deserializeGameState(result.rows[0]);
    } catch (error) {
      if (error instanceof GameNotFoundError || error instanceof ConcurrencyError) {
        throw error;
      }
      logger.error('Failed to update game in database', {
        gameId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a game by its ID
   */
  async delete(gameId: string): Promise<void> {
    const query = 'DELETE FROM games WHERE game_id = $1';
    await this.pool.query(query, [gameId]);
  }

  /**
   * Performs a health check on the database connection
   * @returns true if database is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    const logger = getLogger();
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Closes all connections in the pool
   */
  async close(): Promise<void> {
    const logger = getLogger();
    logger.info('Closing repository database connections');
    await this.pool.end();
    logger.info('Repository database connections closed');
  }
}
