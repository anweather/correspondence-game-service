import { PlayerIdentity } from '@domain/models/PlayerIdentity';

/**
 * In-memory repository for player identities
 * Maps player names to their persistent IDs
 */
export class InMemoryPlayerIdentityRepository {
  private identities: Map<string, PlayerIdentity> = new Map();

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
   * Clear all identities (for testing)
   */
  async clear(): Promise<void> {
    this.identities.clear();
  }
}
