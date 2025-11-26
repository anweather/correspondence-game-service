/**
 * Unit tests for authentication error types
 * Requirements: 8.1, 8.2, 8.5, 8.6
 *
 * RED phase: These tests should FAIL until error types are implemented
 */

import {
  AuthenticationRequiredError,
  InvalidTokenError,
  ForbiddenError,
} from '../../../src/domain/errors';

describe('Authentication Error Types', () => {
  describe('AuthenticationRequiredError', () => {
    it('should create error with correct message and status code', () => {
      const error = new AuthenticationRequiredError();

      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationRequiredError');
    });

    it('should be instance of Error', () => {
      const error = new AuthenticationRequiredError();

      expect(error).toBeInstanceOf(Error);
    });

    it('should have proper stack trace', () => {
      const error = new AuthenticationRequiredError();

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AuthenticationRequiredError');
    });
  });

  describe('InvalidTokenError', () => {
    it('should create error with default message for missing token', () => {
      const error = new InvalidTokenError('missing');

      expect(error.message).toBe('Invalid authentication token');
      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('InvalidTokenError');
      expect(error.details).toEqual({ reason: 'missing' });
    });

    it('should create error with message for malformed token', () => {
      const error = new InvalidTokenError('malformed');

      expect(error.message).toBe('Invalid authentication token');
      expect(error.details).toEqual({ reason: 'malformed' });
    });

    it('should create error with message for expired token', () => {
      const error = new InvalidTokenError('expired');

      expect(error.message).toBe('Authentication token expired');
      expect(error.code).toBe('TOKEN_EXPIRED');
      expect(error.statusCode).toBe(401);
      expect(error.details).toEqual({ reason: 'expired' });
    });

    it('should be instance of Error', () => {
      const error = new InvalidTokenError('invalid');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ForbiddenError', () => {
    it('should create error with custom message', () => {
      const message = 'Not a participant in this game';
      const error = new ForbiddenError(message);

      expect(error.message).toBe(`Forbidden: ${message}`);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create error with default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden: Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });

    it('should be instance of Error', () => {
      const error = new ForbiddenError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have proper stack trace', () => {
      const error = new ForbiddenError('test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ForbiddenError');
    });
  });
});
