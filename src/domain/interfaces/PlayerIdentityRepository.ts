import { PlayerIdentity } from '../models/PlayerIdentity';

/**
 * Parameters for creating a new player identity
 */
export interface CreatePlayerIdentityParams {
  name: string;
  externalAuthProvider?: string;
  externalAuthId?: string;
  email?: string;
}

/**
 * Repository interface for player identity persistence
 */
export interface PlayerIdentityRepository {
  /**
   * Find player by external authentication provider and ID
   */
  findByExternalId(provider: string, externalId: string): Promise<PlayerIdentity | null>;

  /**
   * Create a new player identity
   */
  create(params: CreatePlayerIdentityParams): Promise<PlayerIdentity>;

  /**
   * Get or create a player identity by name (for backward compatibility)
   */
  getOrCreate(name: string): Promise<PlayerIdentity>;

  /**
   * Get all known player identities
   */
  findAll(): Promise<PlayerIdentity[]>;

  /**
   * Get player identity by name
   */
  findByName(name: string): Promise<PlayerIdentity | null>;
}
