/**
 * PostgreSQL implementation of PlayerIdentityRepository
 * Persists player identities to the player_identities table
 */

import { Pool, PoolConfig } from 'pg';
import { PlayerIdentity } from '@domain/models/PlayerIdentity';
import {
  PlayerIdentityRepository,
  CreatePlayerIdentityParams,
} from '@domain/interfaces/PlayerIdentityRepository';
import { getLogger } from '../logging/Logger';

interface DatabaseRow {
  id: string;
  name: string;
  external_auth_provider: string | null;
  external_auth_id: string | null;
  email: string | null;
  created_at: Date;
  last_used: Date;
}

export class PostgresPlayerIdentityRepository implements PlayerIdentityRepository {
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
   * Deserialize database row to PlayerIdentity
   */
  private deserialize(row: DatabaseRow): PlayerIdentity {
    return {
      id: row.id,
      name: row.name,
      externalAuthProvider: row.external_auth_provider || undefined,
      externalAuthId: row.external_auth_id || undefined,
      email: row.email || undefined,
      createdAt: new Date(row.created_at),
      lastUsed: new Date(row.last_used),
    };
  }

  /**
   * Find player by external authentication provider and ID
   */
  async findByExternalId(provider: string, externalId: string): Promise<PlayerIdentity | null> {
    const query = `
      SELECT * FROM player_identities
      WHERE external_auth_provider = $1 AND external_auth_id = $2
    `;

    const result = await this.pool.query(query, [provider, externalId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserialize(result.rows[0]);
  }

  /**
   * Create a new player identity
   */
  async create(params: CreatePlayerIdentityParams): Promise<PlayerIdentity> {
    const logger = getLogger();

    // Check for duplicate external auth ID
    if (params.externalAuthProvider && params.externalAuthId) {
      const existing = await this.findByExternalId(
        params.externalAuthProvider,
        params.externalAuthId
      );
      if (existing) {
        throw new Error(
          `Player with external auth ID ${params.externalAuthId} for provider ${params.externalAuthProvider} already exists`
        );
      }
    }

    const query = `
      INSERT INTO player_identities (name, external_auth_provider, external_auth_id, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [
        params.name.trim(),
        params.externalAuthProvider || null,
        params.externalAuthId || null,
        params.email || null,
      ]);

      logger.info('Player identity created', {
        playerId: result.rows[0].id,
        externalAuthProvider: params.externalAuthProvider,
      });

      return this.deserialize(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create player identity', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update last used timestamp for a player
   */
  async updateLastUsed(playerId: string): Promise<void> {
    const query = `
      UPDATE player_identities
      SET last_used = NOW()
      WHERE id = $1
    `;

    await this.pool.query(query, [playerId]);
  }

  /**
   * Get all known player identities
   */
  async findAll(): Promise<PlayerIdentity[]> {
    const query = `
      SELECT * FROM player_identities
      ORDER BY last_used DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map((row) => this.deserialize(row));
  }

  /**
   * Get player identity by name
   */
  async findByName(name: string): Promise<PlayerIdentity | null> {
    const query = `
      SELECT * FROM player_identities
      WHERE LOWER(name) = LOWER($1)
    `;

    const result = await this.pool.query(query, [name.trim()]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserialize(result.rows[0]);
  }

  /**
   * Get or create a player identity by name (for backward compatibility)
   */
  async getOrCreate(name: string): Promise<PlayerIdentity> {
    const existing = await this.findByName(name);

    if (existing) {
      await this.updateLastUsed(existing.id);
      return existing;
    }

    return this.create({ name: name.trim() });
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
    logger.info('Closing player identity repository database connections');
    await this.pool.end();
    logger.info('Player identity repository database connections closed');
  }
}
