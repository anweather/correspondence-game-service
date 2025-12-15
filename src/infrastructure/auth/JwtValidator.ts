/**
 * JWT token validation service for WebSocket authentication
 * Requirements: 15.1, 15.2, 15.3
 */

import { verifyToken } from '@clerk/backend';
import { getLogger } from '../logging/Logger';

/**
 * Result of JWT token validation
 */
export interface JwtValidationResult {
  isValid: boolean;
  userId?: string;
  error?: string;
}

/**
 * JWT token validator for Clerk tokens
 * Handles token validation, expiration checking, and user ID extraction
 */
export class JwtValidator {
  private readonly logger = getLogger();

  /**
   * Validate a JWT token and extract user information
   * Requirements: 15.1, 15.2, 15.3
   *
   * @param token - JWT token to validate
   * @returns Validation result with user ID if valid
   */
  async validateToken(token: string): Promise<JwtValidationResult> {
    // Check if token is provided
    if (!token || token.trim() === '') {
      return {
        isValid: false,
        error: 'Token is required',
      };
    }

    try {
      // Verify token using Clerk backend
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      // Extract user ID from token payload
      const userId = payload.sub;
      if (!userId) {
        this.logger.warn('JWT token missing user ID (sub claim)', {
          token: token.substring(0, 20) + '...',
        });
        return {
          isValid: false,
          error: 'Token missing user ID',
        };
      }

      this.logger.debug('JWT token validated successfully', { userId });

      return {
        isValid: true,
        userId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn('JWT token validation failed', {
        error: errorMessage,
        token: token.substring(0, 20) + '...',
      });

      return {
        isValid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Extract user ID from a JWT token without full validation result
   * Convenience method that returns null for invalid tokens
   * Requirements: 15.2, 15.3
   *
   * @param token - JWT token to extract user ID from
   * @returns User ID if token is valid, null otherwise
   */
  async extractUserIdFromToken(token: string): Promise<string | null> {
    const result = await this.validateToken(token);
    return result.isValid ? result.userId! : null;
  }
}
