import * as fc from 'fast-check';
import { ClerkAuthenticationService } from '@adapters/rest/auth/clerk/ClerkAuthenticationService';
import { ExternalAuthUser } from '@domain/interfaces/authentication';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';

/**
 * Property-Based Tests for ClerkAuthenticationService
 *
 * These tests verify universal properties that should hold across all inputs
 * using fast-check to generate random test data.
 */

describe('ClerkAuthenticationService - Property-Based Tests', () => {
  /**
   * **Feature: authentication-authorization, Property 5: OAuth provider data persistence**
   * **Validates: Requirements 2.7**
   *
   * Property: For any Clerk user, when mapped to PlayerIdentity,
   * the PlayerIdentity should contain the provider name ('clerk') and provider user ID
   */
  it('Property 5: OAuth provider data persistence - any Clerk user maps to PlayerIdentity with provider data', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary external users with valid (non-whitespace-only) usernames
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          username: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          email: fc.option(fc.emailAddress(), { nil: undefined }),
          firstName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: undefined,
          }),
          lastName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
            nil: undefined,
          }),
        }),
        async (externalUser: ExternalAuthUser) => {
          // Arrange: Create fresh repository and service for each test
          const repository = new InMemoryPlayerIdentityRepository();
          const service = new ClerkAuthenticationService(repository);

          // Act: Map external user to PlayerIdentity
          const playerIdentity = await service.findOrCreatePlayer(externalUser);

          // Assert: PlayerIdentity must contain provider data
          expect(playerIdentity.externalAuthProvider).toBe('clerk');
          expect(playerIdentity.externalAuthId).toBe(externalUser.id);
          // Name should be trimmed version of username (repository trims whitespace)
          expect(playerIdentity.name).toBe(externalUser.username.trim());

          // Email should be preserved if provided
          if (externalUser.email) {
            expect(playerIdentity.email).toBe(externalUser.email);
          }

          // ID should be generated
          expect(playerIdentity.id).toBeDefined();
          expect(typeof playerIdentity.id).toBe('string');
          expect(playerIdentity.id.length).toBeGreaterThan(0);

          // Timestamps should be set
          expect(playerIdentity.createdAt).toBeInstanceOf(Date);
          expect(playerIdentity.lastUsed).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Additional property: Idempotence of findOrCreatePlayer
   *
   * Property: For any external user, calling findOrCreatePlayer twice
   * should return the same PlayerIdentity (same ID)
   */
  it('Property: findOrCreatePlayer is idempotent - calling twice returns same player', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          username: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          email: fc.option(fc.emailAddress(), { nil: undefined }),
        }),
        async (externalUser: ExternalAuthUser) => {
          // Arrange
          const repository = new InMemoryPlayerIdentityRepository();
          const service = new ClerkAuthenticationService(repository);

          // Act: Call findOrCreatePlayer twice
          const firstPlayer = await service.findOrCreatePlayer(externalUser);
          const secondPlayer = await service.findOrCreatePlayer(externalUser);

          // Assert: Should return the same player (same ID)
          expect(secondPlayer.id).toBe(firstPlayer.id);
          expect(secondPlayer.externalAuthId).toBe(firstPlayer.externalAuthId);
          expect(secondPlayer.externalAuthProvider).toBe(firstPlayer.externalAuthProvider);
          expect(secondPlayer.createdAt).toEqual(firstPlayer.createdAt);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Provider consistency
   *
   * Property: For any external user, the provider should always be 'clerk'
   */
  it('Property: Provider is always clerk - regardless of input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          username: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          email: fc.option(fc.emailAddress(), { nil: undefined }),
        }),
        async (externalUser: ExternalAuthUser) => {
          // Arrange
          const repository = new InMemoryPlayerIdentityRepository();
          const service = new ClerkAuthenticationService(repository);

          // Act
          const playerIdentity = await service.findOrCreatePlayer(externalUser);

          // Assert: Provider must always be 'clerk'
          expect(playerIdentity.externalAuthProvider).toBe('clerk');
        }
      ),
      { numRuns: 100 }
    );
  });
});
