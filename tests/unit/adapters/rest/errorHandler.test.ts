/**
 * Unit tests for error handler middleware with authentication errors
 * Requirements: 8.1, 8.2, 8.5, 8.6
 *
 * RED phase: These tests should FAIL until error handler is updated
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../../src/adapters/rest/app';
import {
  AuthenticationRequiredError,
  InvalidTokenError,
  ForbiddenError,
  GameError,
} from '../../../../src/domain/errors';
import { getLogger } from '../../../../src/infrastructure/logging/Logger';

// Mock the logger
jest.mock('../../../../src/infrastructure/logging/Logger');

describe('Error Handler Middleware - Authentication Errors', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockLogger: any;

  beforeEach(() => {
    mockRequest = {
      requestId: 'test-request-id',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

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

  describe('AuthenticationRequiredError handling', () => {
    it('should return 401 status with correct error response', () => {
      const error = new AuthenticationRequiredError();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
    });

    it('should log authentication error without sensitive data', () => {
      const error = new AuthenticationRequiredError();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication error occurred',
        expect.objectContaining({
          requestId: 'test-request-id',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        })
      );

      // Verify no sensitive data in logs
      const logCall = mockLogger.warn.mock.calls[0];
      const logData = JSON.stringify(logCall);
      expect(logData).not.toContain('token');
      expect(logData).not.toContain('secret');
      expect(logData).not.toContain('password');
    });
  });

  describe('InvalidTokenError handling', () => {
    it('should return 401 for invalid token', () => {
      const error = new InvalidTokenError('malformed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          details: { reason: 'malformed' },
        },
      });
    });

    it('should return 401 for expired token', () => {
      const error = new InvalidTokenError('expired');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token expired',
          details: { reason: 'expired' },
        },
      });
    });

    it('should log token error without exposing token value', () => {
      const error = new InvalidTokenError('invalid');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalled();

      // Verify no token values in logs
      const logCall = mockLogger.warn.mock.calls[0];
      const logData = JSON.stringify(logCall);
      expect(logData).not.toMatch(/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/); // No JWT tokens
      expect(logData).not.toContain('sk_'); // No Clerk secret keys
    });
  });

  describe('ForbiddenError handling', () => {
    it('should return 403 for forbidden access', () => {
      const error = new ForbiddenError('Not a participant in this game');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden: Not a participant in this game',
        },
      });
    });

    it('should log forbidden error with request context', () => {
      const error = new ForbiddenError('Access denied');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication error occurred',
        expect.objectContaining({
          requestId: 'test-request-id',
          code: 'FORBIDDEN',
        })
      );
    });
  });

  describe('Error logging security', () => {
    it('should not log sensitive authentication data', () => {
      const errors = [
        new AuthenticationRequiredError(),
        new InvalidTokenError('expired'),
        new ForbiddenError('test'),
      ];

      errors.forEach((error) => {
        mockLogger.warn.mockClear();
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const allLogCalls = mockLogger.warn.mock.calls;
        const allLogData = JSON.stringify(allLogCalls);

        // Verify no sensitive patterns
        expect(allLogData).not.toMatch(/Bearer\s+[\w-]+/);
        expect(allLogData).not.toMatch(/sk_[a-zA-Z0-9]+/);
        expect(allLogData).not.toMatch(/pk_[a-zA-Z0-9]+/);
        expect(allLogData).not.toContain('password');
        expect(allLogData).not.toContain('secret');
      });
    });

    it('should include request ID for debugging', () => {
      const error = new AuthenticationRequiredError();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requestId: 'test-request-id',
        })
      );
    });
  });

  describe('Backward compatibility with existing errors', () => {
    it('should still handle GameError instances correctly', () => {
      const error = new GameError('Test error', 'TEST_ERROR', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
        },
      });
    });

    it('should handle unknown errors as before', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
