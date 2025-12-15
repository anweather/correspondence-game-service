/**
 * Unit tests for JwtValidator
 * Requirements: 15.1, 15.2, 15.3
 */

// Mock Clerk backend before importing
jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

import { JwtValidator } from '../../../../src/infrastructure/auth/JwtValidator';
import { verifyToken } from '@clerk/backend';

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('JwtValidator', () => {
  let jwtValidator: JwtValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtValidator = new JwtValidator();
  });

  describe('validateToken', () => {
    it('should validate a valid Clerk JWT token and return user ID', async () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      const expectedUserId = 'user_123456789';

      mockVerifyToken.mockResolvedValue({
        __raw: 'raw-token',
        iss: 'https://clerk.dev',
        sub: expectedUserId,
        sid: 'session_123',
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        v: 2,
      } as any);

      // Act
      const result = await jwtValidator.validateToken(validToken);

      // Assert
      expect(result).toEqual({
        isValid: true,
        userId: expectedUserId,
      });
      expect(mockVerifyToken).toHaveBeenCalledWith(validToken, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    });

    it('should return invalid result for expired token', async () => {
      // Arrange
      const expiredToken = 'expired.jwt.token';

      mockVerifyToken.mockRejectedValue(new Error('Token expired'));

      // Act
      const result = await jwtValidator.validateToken(expiredToken);

      // Assert
      expect(result).toEqual({
        isValid: false,
        error: 'Token expired',
      });
    });

    it('should return invalid result for malformed token', async () => {
      // Arrange
      const malformedToken = 'invalid-token';

      mockVerifyToken.mockRejectedValue(new Error('Invalid token format'));

      // Act
      const result = await jwtValidator.validateToken(malformedToken);

      // Assert
      expect(result).toEqual({
        isValid: false,
        error: 'Invalid token format',
      });
    });

    it('should return invalid result for token without subject', async () => {
      // Arrange
      const tokenWithoutSub = 'token.without.sub';

      mockVerifyToken.mockResolvedValue({
        __raw: 'raw-token',
        iss: 'https://clerk.dev',
        sid: 'session_123',
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        v: 2,
        // Missing 'sub' field
      } as any);

      // Act
      const result = await jwtValidator.validateToken(tokenWithoutSub);

      // Assert
      expect(result).toEqual({
        isValid: false,
        error: 'Token missing user ID',
      });
    });

    it('should handle empty or null token', async () => {
      // Act & Assert
      const emptyResult = await jwtValidator.validateToken('');
      expect(emptyResult).toEqual({
        isValid: false,
        error: 'Token is required',
      });

      const nullResult = await jwtValidator.validateToken(null as any);
      expect(nullResult).toEqual({
        isValid: false,
        error: 'Token is required',
      });
    });

    it('should handle verification errors gracefully', async () => {
      // Arrange
      const token = 'some.jwt.token';

      mockVerifyToken.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await jwtValidator.validateToken(token);

      // Assert
      expect(result).toEqual({
        isValid: false,
        error: 'Network error',
      });
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const token = 'some.jwt.token';

      mockVerifyToken.mockRejectedValue('String error');

      // Act
      const result = await jwtValidator.validateToken(token);

      // Assert
      expect(result).toEqual({
        isValid: false,
        error: 'Unknown error',
      });
    });
  });

  describe('extractUserIdFromToken', () => {
    it('should extract user ID from valid token', async () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      const expectedUserId = 'user_987654321';

      mockVerifyToken.mockResolvedValue({
        __raw: 'raw-token',
        iss: 'https://clerk.dev',
        sub: expectedUserId,
        sid: 'session_123',
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        v: 2,
      } as any);

      // Act
      const userId = await jwtValidator.extractUserIdFromToken(validToken);

      // Assert
      expect(userId).toBe(expectedUserId);
    });

    it('should return null for invalid token', async () => {
      // Arrange
      const invalidToken = 'invalid.token';

      mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      const userId = await jwtValidator.extractUserIdFromToken(invalidToken);

      // Assert
      expect(userId).toBeNull();
    });

    it('should return null for token without subject', async () => {
      // Arrange
      const tokenWithoutSub = 'token.without.sub';

      mockVerifyToken.mockResolvedValue({
        __raw: 'raw-token',
        iss: 'https://clerk.dev',
        sid: 'session_123',
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        v: 2,
        // Missing 'sub' field
      } as any);

      // Act
      const userId = await jwtValidator.extractUserIdFromToken(tokenWithoutSub);

      // Assert
      expect(userId).toBeNull();
    });
  });
});
