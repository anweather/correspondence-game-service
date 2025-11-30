import { IPlayerProfileRepository } from '@domain/interfaces/IPlayerProfileRepository';
import {
  PlayerProfile,
  validateDisplayName as domainValidateDisplayName,
} from '@domain/models/PlayerProfile';

/**
 * Service for managing player profiles
 * Handles profile creation, updates, and display name management
 */
export class PlayerProfileService {
  constructor(private repository: IPlayerProfileRepository) {}

  /**
   * Create a new player profile
   * @param userId - The user ID from authentication provider
   * @param displayName - Optional display name (will generate default if not provided)
   * @returns The created player profile
   * @throws Error if display name is invalid or already taken
   */
  async createProfile(userId: string, displayName?: string): Promise<PlayerProfile> {
    // Generate default display name if not provided
    const finalDisplayName = displayName || (await this.generateDefaultDisplayName());

    // Validate display name
    this.validateDisplayNameOrThrow(finalDisplayName);

    // Create profile in repository
    return await this.repository.create({
      userId,
      displayName: finalDisplayName,
    });
  }

  /**
   * Get a player profile by user ID
   * @param userId - The user ID to look up
   * @returns The player profile, or null if not found
   */
  async getProfile(userId: string): Promise<PlayerProfile | null> {
    return await this.repository.findByUserId(userId);
  }

  /**
   * Update a player's display name
   * @param userId - The user ID whose profile to update
   * @param newDisplayName - The new display name
   * @returns The updated player profile
   * @throws Error if display name is invalid or already taken
   */
  async updateDisplayName(userId: string, newDisplayName: string): Promise<PlayerProfile> {
    // Validate display name
    this.validateDisplayNameOrThrow(newDisplayName);

    // Update profile in repository
    return await this.repository.update(userId, {
      displayName: newDisplayName,
    });
  }

  /**
   * Validate a display name
   * @param displayName - The display name to validate
   * @returns true if valid, false otherwise
   */
  validateDisplayName(displayName: string): boolean {
    return domainValidateDisplayName(displayName);
  }

  /**
   * Generate a unique default display name in the format "player{number}"
   * @returns A unique display name
   */
  async generateDefaultDisplayName(): Promise<string> {
    let counter = 1;
    let displayName = `player${counter}`;

    // Keep trying until we find an available name
    while (!(await this.repository.isDisplayNameAvailable(displayName))) {
      counter++;
      displayName = `player${counter}`;
    }

    return displayName;
  }

  /**
   * Validate display name and throw error if invalid
   * @param displayName - The display name to validate
   * @throws Error with specific validation message
   */
  private validateDisplayNameOrThrow(displayName: string): void {
    // Check length
    if (displayName.length < 3 || displayName.length > 20) {
      throw new Error('Display name must be between 3 and 20 characters');
    }

    // Check characters (alphanumeric and underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(displayName)) {
      throw new Error('Display name can only contain letters, numbers, and underscores');
    }

    // Check reserved names (case-insensitive)
    const reservedNames = ['admin', 'system', 'bot', 'moderator'];
    if (reservedNames.includes(displayName.toLowerCase())) {
      throw new Error('Display name is reserved and cannot be used');
    }
  }
}
