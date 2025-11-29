/**
 * Player Profile
 * Represents a player's public profile with display name
 */
export interface PlayerProfile {
  /** User ID from authentication provider (e.g., Clerk user ID) */
  userId: string;
  /** Public display name (3-20 chars, alphanumeric + underscore) */
  displayName: string;
  /** Timestamp when profile was created */
  createdAt: Date;
  /** Timestamp when profile was last updated */
  updatedAt: Date;
}

/**
 * Reserved display names that cannot be used
 */
const RESERVED_NAMES = ['admin', 'system', 'bot', 'moderator'];

/**
 * Validates a display name according to the rules:
 * - Length: 3-20 characters
 * - Characters: alphanumeric and underscore only
 * - Not a reserved name
 * 
 * @param displayName - The display name to validate
 * @returns true if valid, false otherwise
 */
export function validateDisplayName(displayName: string): boolean {
  // Check length
  if (displayName.length < 3 || displayName.length > 20) {
    return false;
  }

  // Check characters (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(displayName)) {
    return false;
  }

  // Check reserved names (case-insensitive)
  if (RESERVED_NAMES.includes(displayName.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Generates a default display name in the format "player{number}"
 * 
 * @param number - The sequential number to append
 * @returns A display name in the format "player{number}"
 */
export function generateDefaultDisplayName(number: number): string {
  return `player${number}`;
}
