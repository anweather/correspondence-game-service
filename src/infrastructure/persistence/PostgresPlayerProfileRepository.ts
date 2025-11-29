/**
 * PostgreSQL implementation of IPlayerProfileRepository
 * Persists player profiles to the player_profiles table
 */

import { Pool, PoolConfig } from 'pg';
import { PlayerProfile } from '@domain/models/PlayerProfile';
import {
  IPlayerProfileRepository,
  CreatePlayerProfileParams,
  UpdatePlayerProfileParams,
} from '@domain/interfaces/IPlayerProfileRepository';
import { getLogger } from '../logging/Logger';

interface DatabaseRow {
  user_id: string;
  display_name: string;
  created_at: Date;
  updated_at: Date;
}

export class PostgresPlayerProfileRepository implements IPlayerProfileRepository {
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
   * Deserialize database row to PlayerProfile
   */
  private deserialize(row: DatabaseRow): PlayerProfile {
    return {
      userId: row.user_id,
      displayName: row.display_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Create a new player profile
   * @throws Error if profile already exists or display name is taken
   */
  async create(params: CreatePlayerProfileParams): Promise<PlayerProfile> {
    const logger = getLogger();

    const query = `
      INSERT INTO player_profiles (user_id, display_name)
      VALUES ($1, $2)
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [params.userId, params.displayName]);

      logger.info('Player profile created', {
        userId: params.userId,
        displayName: params.displayName,
      });

      return this.deserialize(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create player profile', {
        error: error instanceof Error ? error.message : String(error),
        userId: params.userId,
      });
      throw error;
    }
  }

  /**
   * Find a player profile by user ID
   */
  async findByUserId(userId: string): Promise<PlayerProfile | null> {
    const query = `
      SELECT * FROM player_profiles WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserialize(result.rows[0]);
  }

  /**
   * Find a player profile by display name
   */
  async findByDisplayName(displayName: string): Promise<PlayerProfile | null> {
    const query = `
      SELECT * FROM player_profiles WHERE display_name = $1
    `;

    const result = await this.pool.query(query, [displayName]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserialize(result.rows[0]);
  }

  /**
   * Update a player profile
   * @throws Error if display name is taken by another user
   */
  async update(userId: string, params: UpdatePlayerProfileParams): Promise<PlayerProfile> {
    const logger = getLogger();

    const query = `
      UPDATE player_profiles
      SET display_name = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [params.displayName, userId]);

      if (result.rows.length === 0) {
        throw new Error(`Player profile not found for user ID: ${userId}`);
      }

      logger.info('Player profile updated', {
        userId,
        displayName: params.displayName,
      });

      return this.deserialize(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update player profile', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete a player profile
   */
  async delete(userId: string): Promise<void> {
    const query = `
      DELETE FROM player_profiles WHERE user_id = $1
    `;

    await this.pool.query(query, [userId]);
  }

  /**
   * Check if a display name is available
   */
  async isDisplayNameAvailable(displayName: string, excludeUserId?: string): Promise<boolean> {
    const query = `
      SELECT * FROM player_profiles WHERE display_name = $1
    `;

    const result = await this.pool.query(query, [displayName]);

    if (result.rows.length === 0) {
      return true;
    }

    // If excludeUserId is provided, check if the found profile belongs to that user
    if (excludeUserId && result.rows[0].user_id === excludeUserId) {
      return true;
    }

    return false;
  }

  /**
   * Get all player profiles (for leaderboard, etc.)
   */
  async findAll(): Promise<PlayerProfile[]> {
    const query = `
      SELECT * FROM player_profiles
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map((row) => this.deserialize(row));
  }

  /**
   * Performs a health check on the database connection
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
    logger.info('Closing player profile repository database connections');
    await this.pool.end();
    logger.info('Player profile repository database connections closed');
  }
}
