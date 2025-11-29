/**
 * PostgreSQL implementation of IInvitationRepository
 * Persists game invitations to the game_invitations table
 */

import { Pool, PoolConfig } from 'pg';
import { GameInvitation, InvitationStatus } from '@domain/models/GameInvitation';
import {
  IInvitationRepository,
  CreateInvitationParams,
  InvitationFilters,
} from '@domain/interfaces/IInvitationRepository';
import { getLogger } from '../logging/Logger';

interface DatabaseRow {
  invitation_id: string;
  game_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  created_at: Date;
  responded_at: Date | null;
}

export class PostgresInvitationRepository implements IInvitationRepository {
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
   * Deserialize database row to GameInvitation
   */
  private deserialize(row: DatabaseRow): GameInvitation {
    return {
      invitationId: row.invitation_id,
      gameId: row.game_id,
      inviterId: row.inviter_id,
      inviteeId: row.invitee_id,
      status: row.status as InvitationStatus,
      createdAt: new Date(row.created_at),
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
    };
  }

  /**
   * Build WHERE clause and parameters from filters
   */
  private buildWhereClause(
    filters?: InvitationFilters,
    baseParamIndex: number = 0
  ): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = baseParamIndex;

    if (filters?.status) {
      paramIndex++;
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
    }

    if (filters?.gameId) {
      paramIndex++;
      conditions.push(`game_id = $${paramIndex}`);
      params.push(filters.gameId);
    }

    if (filters?.inviterId) {
      paramIndex++;
      conditions.push(`inviter_id = $${paramIndex}`);
      params.push(filters.inviterId);
    }

    if (filters?.inviteeId) {
      paramIndex++;
      conditions.push(`invitee_id = $${paramIndex}`);
      params.push(filters.inviteeId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, params };
  }

  /**
   * Create a new game invitation
   * @throws Error if foreign key constraints fail
   */
  async create(params: CreateInvitationParams): Promise<GameInvitation> {
    const logger = getLogger();

    const query = `
      INSERT INTO game_invitations (game_id, inviter_id, invitee_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [
        params.gameId,
        params.inviterId,
        params.inviteeId,
      ]);

      logger.info('Game invitation created', {
        invitationId: result.rows[0].invitation_id,
        gameId: params.gameId,
        inviterId: params.inviterId,
        inviteeId: params.inviteeId,
      });

      return this.deserialize(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create game invitation', {
        error: error instanceof Error ? error.message : String(error),
        gameId: params.gameId,
        inviterId: params.inviterId,
        inviteeId: params.inviteeId,
      });
      throw error;
    }
  }

  /**
   * Find an invitation by ID
   */
  async findById(invitationId: string): Promise<GameInvitation | null> {
    const query = `
      SELECT * FROM game_invitations WHERE invitation_id = $1
    `;

    const result = await this.pool.query(query, [invitationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserialize(result.rows[0]);
  }

  /**
   * Find invitations for a user (as invitee)
   */
  async findByInvitee(inviteeId: string, filters?: InvitationFilters): Promise<GameInvitation[]> {
    const { whereClause, params } = this.buildWhereClause(filters, 1);
    const additionalWhere = whereClause ? `AND ${whereClause.replace('WHERE ', '')}` : '';

    const query = `
      SELECT * FROM game_invitations 
      WHERE invitee_id = $1 ${additionalWhere}
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [inviteeId, ...params]);
    return result.rows.map((row) => this.deserialize(row));
  }

  /**
   * Find invitations sent by a user (as inviter)
   */
  async findByInviter(inviterId: string, filters?: InvitationFilters): Promise<GameInvitation[]> {
    const { whereClause, params } = this.buildWhereClause(filters, 1);
    const additionalWhere = whereClause ? `AND ${whereClause.replace('WHERE ', '')}` : '';

    const query = `
      SELECT * FROM game_invitations 
      WHERE inviter_id = $1 ${additionalWhere}
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [inviterId, ...params]);
    return result.rows.map((row) => this.deserialize(row));
  }

  /**
   * Find invitations for a specific game
   */
  async findByGame(gameId: string, filters?: InvitationFilters): Promise<GameInvitation[]> {
    const { whereClause, params } = this.buildWhereClause(filters, 1);
    const additionalWhere = whereClause ? `AND ${whereClause.replace('WHERE ', '')}` : '';

    const query = `
      SELECT * FROM game_invitations 
      WHERE game_id = $1 ${additionalWhere}
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [gameId, ...params]);
    return result.rows.map((row) => this.deserialize(row));
  }

  /**
   * Update invitation status
   * @throws Error if invitation not found
   */
  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
    respondedAt?: Date
  ): Promise<GameInvitation> {
    const logger = getLogger();

    const query = `
      UPDATE game_invitations
      SET status = $1, responded_at = $2
      WHERE invitation_id = $3
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [status, respondedAt, invitationId]);

      if (result.rows.length === 0) {
        throw new Error(`Invitation not found: ${invitationId}`);
      }

      logger.info('Invitation status updated', {
        invitationId,
        status,
        respondedAt,
      });

      return this.deserialize(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update invitation status', {
        error: error instanceof Error ? error.message : String(error),
        invitationId,
        status,
      });
      throw error;
    }
  }

  /**
   * Delete an invitation
   */
  async delete(invitationId: string): Promise<void> {
    const query = `
      DELETE FROM game_invitations WHERE invitation_id = $1
    `;

    await this.pool.query(query, [invitationId]);
  }

  /**
   * Find all invitations matching filters
   */
  async findAll(filters?: InvitationFilters): Promise<GameInvitation[]> {
    const { whereClause, params } = this.buildWhereClause(filters);

    const query = `
      SELECT * FROM game_invitations 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, params);
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
    logger.info('Closing invitation repository database connections');
    await this.pool.end();
    logger.info('Invitation repository database connections closed');
  }
}
