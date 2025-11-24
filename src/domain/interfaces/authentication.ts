/**
 * Generic authenticated user representation
 * Used throughout application and domain layers
 * No knowledge of Clerk or any specific auth provider
 */
export interface AuthenticatedUser {
  /** Internal player ID */
  id: string;
  /** External auth provider user ID (e.g., Clerk user ID) */
  externalId: string;
  /** Username from auth provider */
  username: string;
  /** Optional email from auth provider */
  email?: string;
}

/**
 * External auth user (from Clerk, Auth0, custom OAuth, etc.)
 * Represents user data from an external authentication provider
 */
export interface ExternalAuthUser {
  /** External provider's user ID */
  id: string;
  /** Username from provider */
  username: string;
  /** Optional email from provider */
  email?: string;
  /** Optional first name from provider */
  firstName?: string;
  /** Optional last name from provider */
  lastName?: string;
}

/**
 * Generic authentication service interface
 * Implemented by Clerk adapter, but could be implemented by any auth provider
 * This interface keeps the domain layer auth-provider-agnostic
 *
 * Note: PlayerIdentity type will be defined in task 4
 */
export interface AuthenticationService {
  /**
   * Find or create PlayerIdentity from external auth provider
   * If a player with the given external ID exists, return it
   * Otherwise, create a new PlayerIdentity and return it
   *
   * @param externalUser - User data from external auth provider
   * @returns PlayerIdentity associated with the external user
   */
  findOrCreatePlayer(externalUser: ExternalAuthUser): Promise<any>; // Will be PlayerIdentity once defined

  /**
   * Get user information from external ID
   * Retrieves user data from the external auth provider
   *
   * @param externalId - External provider's user ID
   * @returns External user data or null if not found
   */
  getUserById(externalId: string): Promise<ExternalAuthUser | null>;
}
