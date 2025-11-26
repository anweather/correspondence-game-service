/**
 * Property-based tests for authentication error handler
 * Feature: authentication-authorization, Property 15: Authentication failure logging
 * Validates: Requirements 8.6
 *
 * RED phase: This test should FAIL until error handler is updated
 */

import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../../src/adapters/rest/app';
import {
  AuthenticationRequiredError,
  InvalidTokenError,
  ForbiddenError,
} from '../../../../src/domain/errors';
import { getLogger } from '../../../../src/infrastructure/logging/Logger';

// Mock the logger
jest.mock('../../../../src/infrastructure/logging/Logger');

describe('Property-Based Tests: Authentication Error Handler', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };

    (getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 15: Authentication failure logging
   * For any authentication failure, the system should log the failure
   * without exposing sensitive information (no tokens, secrets, or passwords in logs)
   */
  describe('Property 15: Authentication failure logging without sensitive data', () => {
    it('should log any authentication error without exposing sensitive data', () => {
      fc.assert(
        fc.property(
          // Generate random authentication errors
          fc.oneof(
            fc.constant(new AuthenticationRequiredError()),
            fc.constantFrom(
              new InvalidTokenError('missing'),
              new InvalidTokenError('malformed'),
              new InvalidTokenError('expired'),
              new InvalidTokenError('invalid')
            ),
            fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new ForbiddenError(msg))
          ),
          // Generate random request IDs
          fc.uuid(),
          // Generate random sensitive data patterns that should NOT appear in logs
          fc.record({
            token: fc.string({ minLength: 20, maxLength: 200 }),
            secret: fc
              .string({ minLength: 32, maxLength: 64 })
              .map((s) => Buffer.from(s).toString('hex').substring(0, 64)),
            password: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          (error, requestId, sensitiveData) => {
            // Setup mock request/response
            const mockRequest = {
              requestId,
              headers: {
                authorization: `Bearer ${sensitiveData.token}`,
              },
            } as Partial<Request>;

            const mockResponse = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn().mockReturnThis(),
            } as Partial<Response>;

            const mockNext = jest.fn() as NextFunction;

            // Clear previous calls
            mockLogger.warn.mockClear();
            mockLogger.error.mockClear();

            // Execute error handler
            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            // Verify logging occurred
            expect(mockLogger.warn).toHaveBeenCalled();

            // Get all log calls and convert to string for analysis
            const allLogCalls = mockLogger.warn.mock.calls;
            const logOutput = JSON.stringify(allLogCalls);

            // Property: No sensitive data should appear in logs
            // Check for token patterns
            expect(logOutput).not.toContain(sensitiveData.token);
            expect(logOutput).not.toMatch(/Bearer\s+[\w-]+/);

            // Check for secret patterns
            expect(logOutput).not.toContain(sensitiveData.secret);
            expect(logOutput).not.toMatch(/sk_[a-zA-Z0-9]+/); // Clerk secret key pattern
            expect(logOutput).not.toMatch(/pk_[a-zA-Z0-9]+/); // Clerk publishable key pattern

            // Check for password
            expect(logOutput).not.toContain(sensitiveData.password);
            expect(logOutput).not.toContain('password');

            // Check for other sensitive keywords
            expect(logOutput.toLowerCase()).not.toContain('secret');

            // Property: Request ID should be included for debugging
            expect(logOutput).toContain(requestId);

            // Property: Error code should be logged
            if (error instanceof AuthenticationRequiredError) {
              expect(logOutput).toContain('AUTHENTICATION_REQUIRED');
            } else if (error instanceof InvalidTokenError) {
              expect(logOutput).toMatch(/INVALID_TOKEN|TOKEN_EXPIRED/);
            } else if (error instanceof ForbiddenError) {
              expect(logOutput).toContain('FORBIDDEN');
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should log error type and request context for any auth error', () => {
      fc.assert(
        fc.property(
          // Generate various authentication errors
          fc.oneof(
            fc.constant(new AuthenticationRequiredError()),
            fc.constantFrom(new InvalidTokenError('missing'), new InvalidTokenError('expired')),
            fc.string().map((msg) => new ForbiddenError(msg))
          ),
          // Generate request metadata
          fc.record({
            requestId: fc.uuid(),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            path: fc.constantFrom('/api/games', '/api/games/123/moves', '/api/players'),
          }),
          (error, requestMetadata) => {
            const mockRequest = {
              requestId: requestMetadata.requestId,
              method: requestMetadata.method,
              path: requestMetadata.path,
            } as Partial<Request>;

            const mockResponse = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn().mockReturnThis(),
            } as Partial<Response>;

            const mockNext = jest.fn() as NextFunction;

            mockLogger.warn.mockClear();

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            // Verify logging occurred with context
            expect(mockLogger.warn).toHaveBeenCalledWith(
              expect.any(String),
              expect.objectContaining({
                requestId: requestMetadata.requestId,
                code: expect.any(String),
                message: expect.any(String),
              })
            );

            // Verify error code is correct
            const logCall = mockLogger.warn.mock.calls[0][1];
            if (error instanceof AuthenticationRequiredError) {
              expect(logCall.code).toBe('AUTHENTICATION_REQUIRED');
            } else if (error instanceof InvalidTokenError) {
              expect(logCall.code).toMatch(/INVALID_TOKEN|TOKEN_EXPIRED/);
            } else if (error instanceof ForbiddenError) {
              expect(logCall.code).toBe('FORBIDDEN');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never log JWT tokens in any format', () => {
      fc.assert(
        fc.property(
          // Generate JWT-like tokens
          fc.record({
            header: fc.base64String({ minLength: 10, maxLength: 50 }),
            payload: fc.base64String({ minLength: 10, maxLength: 100 }),
            signature: fc.base64String({ minLength: 10, maxLength: 50 }),
          }),
          fc.oneof(
            fc.constant(new AuthenticationRequiredError()),
            fc.constant(new InvalidTokenError('invalid'))
          ),
          (jwtParts, error) => {
            const fakeJWT = `${jwtParts.header}.${jwtParts.payload}.${jwtParts.signature}`;

            const mockRequest = {
              requestId: 'test-id',
              headers: {
                authorization: `Bearer ${fakeJWT}`,
              },
            } as Partial<Request>;

            const mockResponse = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn().mockReturnThis(),
            } as Partial<Response>;

            const mockNext = jest.fn() as NextFunction;

            mockLogger.warn.mockClear();

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            const logOutput = JSON.stringify(mockLogger.warn.mock.calls);

            // Property: JWT token should never appear in logs
            expect(logOutput).not.toContain(fakeJWT);
            expect(logOutput).not.toContain(jwtParts.header);
            expect(logOutput).not.toContain(jwtParts.payload);
            expect(logOutput).not.toContain(jwtParts.signature);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
