import { clerkClient } from '@clerk/express';
import { AuthenticationService, ExternalAuthUser } from '@domain/interfaces/authentication';
import { PlayerIdentity } from '@domain/models/PlayerIdentity';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';

/**
 * Clerk-specific implementation of AuthenticationService
 * This is the ONLY file that imports Clerk SDK
 *
 * Responsibilities:
 * - Wrap Clerk SDK
 * - Implement generic AuthenticationService interface
 * - Map Clerk User objects to domain PlayerIdentity
 * - Isolate all Clerk-specific code to this adapter
 */
export class ClerkAuthenticationService implements AuthenticationService {
  constructor(private playerIdentityRepository: InMemoryPlayerIdentityRepository) {}

  /**
   * Find or create PlayerIdentity from external auth provider
   * If a player with the given external ID exists, return it
   * Otherwise, create a new PlayerIdentity and return it
   *
   * @param externalUser - User data from Clerk
   * @returns PlayerIdentity associated with the Clerk user
   */
  async findOrCreatePlayer(externalUser: ExternalAuthUser): Promise<PlayerIdentity> {
    // Check if player exists
    let player = await this.playerIdentityRepository.findByExternalId('clerk', externalUser.id);

    if (!player) {
      // Create new player
      player = await this.playerIdentityRepository.create({
        name: externalUser.username,
        externalAuthProvider: 'clerk',
        externalAuthId: externalUser.id,
        email: externalUser.email,
      });
    }

    return player;
  }

  /**
   * Get user information from Clerk user ID
   * Retrieves user data from Clerk API
   *
   * @param externalId - Clerk user ID
   * @returns External user data or null if not found
   */
  async getUserById(externalId: string): Promise<ExternalAuthUser | null> {
    try {
      const clerkUser = await clerkClient.users.getUser(externalId);

      // Map Clerk User to ExternalAuthUser
      return {
        id: clerkUser.id,
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || 'user',
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined,
      };
    } catch (error) {
      // User not found or other error
      return null;
    }
  }
}
