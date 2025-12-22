import { Response, NextFunction } from 'express';
import { sentinelUserMiddleware } from '../../../../../src/adapters/rest/auth/sentinelUserMiddleware';
import { AuthenticatedRequest } from '../../../../../src/adapters/rest/auth/types';

describe('sentinelUserMiddleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('Sentinel User Detection', () => {
    it('should detect test- prefix and create mock user', () => {
      mockRequest.headers = { 'x-test-user-id': 'test-user-123' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('test-user-123');
      expect(mockRequest.user?.externalId).toBe('test-user-123');
      expect(mockRequest.user?.username).toBe('test-user-123');
      expect(mockRequest.user?.email).toBe('test-user-123@sentinel.test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect blackbox- prefix and create mock user', () => {
      mockRequest.headers = { 'x-test-user-id': 'blackbox-player-alice' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('blackbox-player-alice');
      expect(mockRequest.user?.externalId).toBe('blackbox-player-alice');
      expect(mockRequest.user?.username).toBe('blackbox-player-alice');
      expect(mockRequest.user?.email).toBe('blackbox-player-alice@sentinel.test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass through non-sentinel user IDs', () => {
      mockRequest.headers = { 'x-test-user-id': 'regular-user-123' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass through when no x-test-user-id header present', () => {
      mockRequest.headers = {};

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Production Environment Safety', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should block sentinel users in production environment', () => {
      process.env.NODE_ENV = 'production';
      mockRequest.headers = { 'x-test-user-id': 'test-user-123' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow sentinel users in development environment', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.headers = { 'x-test-user-id': 'test-user-123' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('test-user-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow sentinel users in test environment', () => {
      process.env.NODE_ENV = 'test';
      mockRequest.headers = { 'x-test-user-id': 'blackbox-player-1' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('blackbox-player-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow sentinel users when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;
      mockRequest.headers = { 'x-test-user-id': 'test-user-123' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('test-user-123');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty x-test-user-id header', () => {
      mockRequest.headers = { 'x-test-user-id': '' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle x-test-user-id with only prefix', () => {
      mockRequest.headers = { 'x-test-user-id': 'test-' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should be case-sensitive for prefix matching', () => {
      mockRequest.headers = { 'x-test-user-id': 'TEST-user-123' };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle x-test-user-id as array (take first value)', () => {
      mockRequest.headers = { 'x-test-user-id': ['test-user-123', 'test-user-456'] as any };

      sentinelUserMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('test-user-123');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
