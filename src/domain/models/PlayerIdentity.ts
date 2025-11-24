/**
 * Player Identity
 * Maps player names to their persistent IDs
 * Supports optional external authentication provider integration
 */
export interface PlayerIdentity {
  /** Player's display name */
  name: string;
  /** Internal unique player ID */
  id: string;
  /** External authentication provider (e.g., 'clerk', 'custom-oauth', 'auth0') */
  externalAuthProvider?: string;
  /** External provider's user ID (e.g., Clerk user ID) */
  externalAuthId?: string;
  /** Optional email from authentication provider */
  email?: string;
  /** Timestamp when identity was created */
  createdAt: Date;
  /** Timestamp when identity was last used */
  lastUsed: Date;
}
