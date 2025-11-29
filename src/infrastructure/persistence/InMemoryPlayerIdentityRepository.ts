import { PlayerIdentity } from '@domain/models/PlayerIdentity';
import {
  PlayerIdentityRepository,
  CreatePlayerIdentityParams,
} from '@domain/interfaces/PlayerIdentityRepository';

/**
 * In-memory repository for player identities
 * Maps player names to their persistent IDs
 * Supports external authentication provider integration
 */
export class InMemoryPlayerIdentityRepository implements PlayerIdentityRepository {
  private identities: Map<string, PlayerIdentity> = new Map();
  private externalAuthIndex: Map<string, PlayerIdentity> = new Map();

  /**
   * Get or create a player identity by name
   */
  async getOrCreate(name: string): Promise<PlayerIdentity> {
    const trimmedName = name.trim().toLowerCase(); // Case-insensitive

    const existing = this.identities.get(trimmedName);

    if (existing) {
      // Update last used timestamp
      existing.lastUsed = new Date();
      return existing;
    }

    // Create new identity
    const newIdentity: PlayerIdentity = {
      name: name.trim(), // Preserve original casing
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    this.identities.set(trimmedName, newIdentity);
    return newIdentity;
  }

  /**
   * Get all known player identities
   */
  async findAll(): Promise<PlayerIdentity[]> {
    return Array.from(this.identities.values()).sort(
      (a, b) => b.lastUsed.getTime() - a.lastUsed.getTime()
    );
  }

  /**
   * Get player identity by name
   */
  async findByName(name: string): Promise<PlayerIdentity | null> {
    const trimmedName = name.trim().toLowerCase();
    return this.identities.get(trimmedName) || null;
  }

  /**
   * Find player by external authentication provider and ID
   * @param provider - External auth provider name (e.g., 'clerk', 'custom-oauth')
   * @param externalId - External provider's user ID
   * @returns PlayerIdentity or null if not found
   */
  async findByExternalId(provider: string, externalId: string): Promise<PlayerIdentity | null> {
    const key = `${provider}:${externalId}`;
    return this.externalAuthIndex.get(key) || null;
  }

  /**
   * Create a new player identity
   * @param params - Player identity creation parameters
   * @returns Created PlayerIdentity
   * @throws Error if external auth ID already exists for the provider
   */
  async create(params: CreatePlayerIdentityParams): Promise<PlayerIdentity> {
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

    const now = new Date();
    const newIdentity: PlayerIdentity = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name.trim(),
      externalAuthProvider: params.externalAuthProvider,
      externalAuthId: params.externalAuthId,
      email: params.email,
      createdAt: now,
      lastUsed: now,
    };

    // Store in name index (for backward compatibility)
    const trimmedName = params.name.trim().toLowerCase();
    this.identities.set(trimmedName, newIdentity);

    // Store in external auth index if applicable
    if (params.externalAuthProvider && params.externalAuthId) {
      const key = `${params.externalAuthProvider}:${params.externalAuthId}`;
      this.externalAuthIndex.set(key, newIdentity);
    }

    return newIdentity;
  }

  /**
   * Clear all identities (for testing)
   */
  async clear(): Promise<void> {
    this.identities.clear();
    this.externalAuthIndex.clear();
  }
}
