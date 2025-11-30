/**
 * Unit tests for requireAdmin middleware
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Tests cover:
 * - Authorized admin user access
 * - Unauthorized user rejection (403)
 * - Missing authentication (401)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { Response, NextFunction } from 'express';
import { requireAdmin } from '../../../../../src/adapters/rest/auth/requireAdmin';
import { AuthenticatedRequest } from '../../../../../src/adapters/rest/auth/types';
import { AuthenticatedUser } from '../../../../../src/domain/interfaces/authentication';

// Mock config
jest.mock('../../../../../src/config', () => ({
  loadConfig: jest.fn(),
}));

import { loadConfig } from '../../../../../src/config';

describe('requireAdmin', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('when user is authenticated and is an admin', () => {
    beforeEach(() => {
      // Mock config with admin user IDs
      (loadConfig as jest.Mock).mockReturnValue({
        adminUserIds: ['admin_user_123', 'admin_user_456'],
      });
    });

    it('should call next() when user ID is in admin list', () => {
      const authenticatedUser: AuthenticatedUser = {
        id: 'admin_user_123',
        externalId: 'clerk_admin_123',
        username: 'adminuser',
        email: 'admin@example.com',
      };
      mockRequest.user = authenticatedUser;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should call next() for second admin in list', () => {
      const authenticatedUser: AuthenticatedUser = {
        id: 'admin_user_456',
        externalId: 'clerk_admin_456',
        username: 'adminuser2',
        email: 'admin2@example.com',
      };
      mockRequest.user = authenticatedUser;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('when user is authenticated but not an admin', () => {
    beforeEach(() => {
      // Mock config with admin user IDs
      (loadConfig as jest.Mock).mockReturnValue({
        adminUserIds: ['admin_user_123', 'admin_user_456'],
      });
    });

    it('should return 403 Forbidden when user ID is not in admin list', () => {
      const authenticatedUser: AuthenticatedUser = {
        id: 'regular_user_789',
        externalId: 'clerk_user_789',
        username: 'regularuser',
        email: 'user@example.com',
      };
      mockRequest.user = authenticatedUser;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden: Admin access required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when admin list is empty', () => {
      (loadConfig as jest.Mock).mockReturnValue({
        adminUserIds: [],
      });

      const authenticatedUser: AuthenticatedUser = {
        id: 'regular_user_789',
        externalId: 'clerk_user_789',
        username: 'regularuser',
        email: 'user@example.com',
      };
      mockRequest.user = authenticatedUser;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden: Admin access required',
        },
      });
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      (loadConfig as jest.Mock).mockReturnValue({
        adminUserIds: ['admin_user_123'],
      });
    });

    it('should return 401 when req.user is undefined', () => {
      mockRequest.user = undefined;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when req.user is null', () => {
      mockRequest.user = null as any;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should work with multiple admin IDs', () => {
      // Config already trims whitespace during loading, so mock reflects that
      (loadConfig as jest.Mock).mockReturnValue({
        adminUserIds: ['admin_user_123', 'admin_user_456', 'admin_user_789'],
      });

      const authenticatedUser: AuthenticatedUser = {
        id: 'admin_user_456',
        externalId: 'clerk_admin_456',
        username: 'adminuser',
        email: 'admin@example.com',
      };
      mockRequest.user = authenticatedUser;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Should work with any admin in the list
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should be case-sensitive for user IDs', () => {
      (loadConfig as jest.Mock).mockReturnValue({
        adminUserIds: ['admin_user_123'],
      });

      const authenticatedUser: AuthenticatedUser = {
        id: 'ADMIN_USER_123', // Different case
        externalId: 'clerk_admin_123',
        username: 'adminuser',
        email: 'admin@example.com',
      };
      mockRequest.user = authenticatedUser;

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Should not match due to case difference
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
