import * as fc from 'fast-check';
import { AuthenticatedUser, ExternalAuthUser } from '@domain/interfaces/authentication';

describe('Authentication Interfaces', () => {
  describe('Property-Based Tests', () => {
    /**
     * Feature: authentication-authorization, Property 12: PlayerIdentity structure completeness
     * Validates: Requirements 6.4
     *
     * Property: For any AuthenticatedUser, it must have all required fields:
     * - id (string)
     * - externalId (string)
     * - username (string)
     * - email (optional string)
     */
    it('Property 12: AuthenticatedUser has required fields', () => {
      fc.assert(
        fc.property(
          // Generator for AuthenticatedUser
          fc.record({
            id: fc.string({ minLength: 1 }),
            externalId: fc.string({ minLength: 1 }),
            username: fc.string({ minLength: 1 }),
            email: fc.option(fc.emailAddress(), { nil: undefined }),
          }),
          (user: AuthenticatedUser) => {
            // Verify all required fields are present
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('externalId');
            expect(user).toHaveProperty('username');

            // Verify required fields are non-empty strings
            expect(typeof user.id).toBe('string');
            expect(user.id.length).toBeGreaterThan(0);

            expect(typeof user.externalId).toBe('string');
            expect(user.externalId.length).toBeGreaterThan(0);

            expect(typeof user.username).toBe('string');
            expect(user.username.length).toBeGreaterThan(0);

            // Verify email is optional but if present, is a string
            if (user.email !== undefined) {
              expect(typeof user.email).toBe('string');
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property test for ExternalAuthUser structure
     * Ensures external auth users have required fields
     */
    it('ExternalAuthUser has required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            username: fc.string({ minLength: 1 }),
            email: fc.option(fc.emailAddress(), { nil: undefined }),
            firstName: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            lastName: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          }),
          (user: ExternalAuthUser) => {
            // Verify required fields
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('username');

            expect(typeof user.id).toBe('string');
            expect(user.id.length).toBeGreaterThan(0);

            expect(typeof user.username).toBe('string');
            expect(user.username.length).toBeGreaterThan(0);

            // Verify optional fields
            if (user.email !== undefined) {
              expect(typeof user.email).toBe('string');
            }
            if (user.firstName !== undefined) {
              expect(typeof user.firstName).toBe('string');
            }
            if (user.lastName !== undefined) {
              expect(typeof user.lastName).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    it('AuthenticatedUser type allows valid user objects', () => {
      const validUser: AuthenticatedUser = {
        id: 'player-123',
        externalId: 'clerk-user-456',
        username: 'testuser',
        email: 'test@example.com',
      };

      expect(validUser.id).toBe('player-123');
      expect(validUser.externalId).toBe('clerk-user-456');
      expect(validUser.username).toBe('testuser');
      expect(validUser.email).toBe('test@example.com');
    });

    it('AuthenticatedUser type allows user without email', () => {
      const validUser: AuthenticatedUser = {
        id: 'player-123',
        externalId: 'clerk-user-456',
        username: 'testuser',
      };

      expect(validUser.id).toBe('player-123');
      expect(validUser.externalId).toBe('clerk-user-456');
      expect(validUser.username).toBe('testuser');
      expect(validUser.email).toBeUndefined();
    });

    it('ExternalAuthUser type allows valid external user objects', () => {
      const validUser: ExternalAuthUser = {
        id: 'clerk-user-456',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      expect(validUser.id).toBe('clerk-user-456');
      expect(validUser.username).toBe('testuser');
      expect(validUser.email).toBe('test@example.com');
      expect(validUser.firstName).toBe('Test');
      expect(validUser.lastName).toBe('User');
    });

    it('ExternalAuthUser type allows minimal user object', () => {
      const validUser: ExternalAuthUser = {
        id: 'clerk-user-456',
        username: 'testuser',
      };

      expect(validUser.id).toBe('clerk-user-456');
      expect(validUser.username).toBe('testuser');
      expect(validUser.email).toBeUndefined();
      expect(validUser.firstName).toBeUndefined();
      expect(validUser.lastName).toBeUndefined();
    });
  });
});
