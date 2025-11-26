/**
 * Property-based tests for authentication middleware
 * Following TDD Red-Green-Refactor: These tests should FAIL initially
 *
 * Uses fast-check for property-based testing with 100+ iterations
 *
 * Properties tested:
 * - Property 1: Authentication bypass when disabled
 * - Property 2: Authentication enforcement when enabled
 * - Property 8: Request context population
 *
 * Requirements: 1.1, 1.2, 4.3
 */

import * as fc from 'fast-check';
import { Response } from 'express';
import { clerkMiddleware } from '../../../../../src/adapters/rest/auth/clerkMiddleware';
import { requireAuth } from '../../../../../src/adapters/rest/auth/requireAuth';
import { AuthenticatedRequest } from '../../../../../src/adapters/rest/auth/types';
import { AuthenticatedUser } from '../../../../../src/domain/interfaces/authentication';

// Mock Clerk SDK
jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(),
  getAuth: jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
}));

// Mock config
jest.mock('../../../../../src/config', () => ({
  loadConfig: jest.fn(),
}));

import { getAuth, clerkClient } from '@clerk/express';
import { loadConfig } from '../../../../../src/config';

/**
 * Arbitrary generator for HTTP request paths
 */
const arbitraryRequestPath = fc.oneof(
  fc.constant('/api/games'),
  fc.constant('/api/games/123/moves'),
  fc.constant('/api/games/456'),
  fc.constant('/api/health'),
  fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/api/${s}`)
);

/**
 * Arbitrary generator for HTTP methods
 */
const arbitraryHttpMethod = fc.oneof(
  fc.constant('GET'),
  fc.constant('POST'),
  fc.constant('PUT'),
  fc.constant('DELETE'),
  fc.constant('PATCH')
);

/**
 * Arbitrary generator for request headers
 */
const arbitraryHeaders = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.string({ minLength: 0, maxLength: 100 })
);

/**
 * Property 1: Authentication bypass when disabled
 * Feature: authentication-authorization, Property 1: Authentication bypass when disabled
 * Validates: Requirements 1.1
 *
 * For any API request, when AUTH_ENABLED is false, the request should succeed
 * without requiring authentication headers
 */
describe('Property 1: Authentication bypass when disabled', () => {
  it('should allow any request to proceed when AUTH_ENABLED is false', () => {
    fc.assert(
      fc.property(
        arbitraryRequestPath,
        arbitraryHttpMethod,
        arbitraryHeaders,
        (path, method, headers) => {
          // Configure auth as disabled
          (loadConfig as jest.Mock).mockReturnValue({
            auth: {
              enabled: false,
              clerk: {
                publishableKey: '',
                secretKey: '',
              },
            },
          });

          // Create mock request
          const mockRequest = {
            path,
            method,
            headers,
          } as Partial<AuthenticatedRequest>;

          const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          } as Partial<Response>;

          const mockNext = jest.fn();

          // Execute middleware
          const middleware = clerkMiddleware();
          middleware(mockRequest as any, mockResponse as Response, mockNext);

          // Property: next() should always be called (request proceeds)
          expect(mockNext).toHaveBeenCalled();
          // Property: user should not be populated (no auth check)
          expect(mockRequest.user).toBeUndefined();
          // Property: no error response should be sent
          expect(mockResponse.status).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Authentication enforcement when enabled
 * Feature: authentication-authorization, Property 2: Authentication enforcement when enabled
 * Validates: Requirements 1.2, 5.5, 7.2
 *
 * For any protected route, when AUTH_ENABLED is true and no valid authentication
 * token is provided, the request should be rejected with a 401 status
 */
describe('Property 2: Authentication enforcement when enabled', () => {
  it('should reject any unauthenticated request to protected routes', () => {
    fc.assert(
      fc.property(arbitraryRequestPath, arbitraryHttpMethod, (path, method) => {
        // Create mock request without authentication
        const mockRequest = {
          path,
          method,
          headers: {},
          user: undefined,
        } as Partial<AuthenticatedRequest>;

        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as Partial<Response>;

        const mockNext = jest.fn();

        // Execute requireAuth middleware
        requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        // Property: 401 status should be returned
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        // Property: error message should indicate authentication required
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        });
        // Property: next() should NOT be called (request blocked)
        expect(mockNext).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Arbitrary generator for authenticated users
 */
const arbitraryAuthenticatedUser = fc.record({
  id: fc.uuid(),
  externalId: fc.string({ minLength: 10, maxLength: 50 }),
  username: fc.string({ minLength: 3, maxLength: 30 }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
});

/**
 * Property 8: Request context population
 * Feature: authentication-authorization, Property 8: Request context population
 * Validates: Requirements 4.3
 *
 * For any authenticated request, the request context should contain the
 * authenticated user's identity (playerId, username, provider)
 */
describe('Property 8: Request context population', () => {
  beforeEach(() => {
    // Configure auth as enabled
    (loadConfig as jest.Mock).mockReturnValue({
      auth: {
        enabled: true,
        clerk: {
          publishableKey: 'pk_test_123',
          secretKey: 'sk_test_123',
        },
      },
    });
  });

  it('should populate req.user for any authenticated request', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRequestPath,
        arbitraryHttpMethod,
        arbitraryAuthenticatedUser,
        async (path, method, user) => {
          // Mock Clerk auth with valid session
          (getAuth as jest.Mock).mockReturnValue({
            userId: user.externalId,
            sessionId: 'session_' + user.id,
          });

          // Mock Clerk client to return user data
          (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
            id: user.externalId,
            username: user.username,
            emailAddresses: [{ emailAddress: user.email }],
            firstName: 'Test',
            lastName: 'User',
          });

          // Create mock request
          const mockRequest = {
            path,
            method,
            headers: {},
          } as Partial<AuthenticatedRequest>;

          const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          } as Partial<Response>;

          const mockNext = jest.fn();

          // Execute middleware
          const middleware = clerkMiddleware();
          await middleware(mockRequest as any, mockResponse as Response, mockNext);

          // Property: req.user should be populated
          expect(mockRequest.user).toBeDefined();
          // Property: req.user should contain externalId
          expect(mockRequest.user?.externalId).toBe(user.externalId);
          // Property: next() should be called
          expect(mockNext).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve user context through requireAuth middleware', () => {
    fc.assert(
      fc.property(arbitraryAuthenticatedUser, (user) => {
        // Create mock request with authenticated user
        const mockRequest = {
          user: user as AuthenticatedUser,
          headers: {},
        } as Partial<AuthenticatedRequest>;

        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as Partial<Response>;

        const mockNext = jest.fn();

        // Execute requireAuth middleware
        requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        // Property: user context should be preserved
        expect(mockRequest.user).toEqual(user);
        // Property: next() should be called
        expect(mockNext).toHaveBeenCalled();
        // Property: no error response
        expect(mockResponse.status).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
