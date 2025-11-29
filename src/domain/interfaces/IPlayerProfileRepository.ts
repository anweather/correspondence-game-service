import { PlayerProfile } from '../models/PlayerProfile';

/**
 * Parameters for creating a new player profile
 */
export interface CreatePlayerProfileParams {
  userId: string;
  displayName: string;
}

/**
 * Parameters for updating a player profile
 */
export interface UpdatePlayerProfileParams {
  displayName?: string;
}

/**
 * Repository interface for player profile persistence
 */
export interface IPlayerProfileRepository {
  /**
   * Create a new player profile
   * @throws Error if profile already exists or display name is taken
   */
  create(params: CreatePlayerProfileParams): Promise<PlayerProfile>;

  /**
   * Find a player profile by user ID
   */
  findByUserId(userId: string): Promise<PlayerProfile | null>;

  /**
   * Find a player profile by display name
   */
  findByDisplayName(displayName: string): Promise<PlayerProfile | null>;

  /**
   * Update a player profile
   * @throws Error if display name is taken by another user
   */
  update(userId: string, params: UpdatePlayerProfileParams): Promise<PlayerProfile>;

  /**
   * Delete a player profile
   */
  delete(userId: string): Promise<void>;

  /**
   * Check if a display name is available
   */
  isDisplayNameAvailable(displayName: string, excludeUserId?: string): Promise<boolean>;

  /**
   * Get all player profiles (for leaderboard, etc.)
   */
  findAll(): Promise<PlayerProfile[]>;
}
