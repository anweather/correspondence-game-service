import * as fc from 'fast-check';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';

/**
 * Property-based tests for InMemoryPlayerIdentityRepository
 * These tests verify universal properties that should hold across all inputs
 */
describe('InMemoryPlayerIdentityRepository - Property-Based Tests', () => {
  let repository: InMemoryPlayerIdentityRepository;

  beforeEach(() => {
    repository = new InMemoryPlayerIdentityRepository();
  });

  describe('Property 9: PlayerIdentity creation on authentication', () => {
    /**
     * **Feature: authentication-authorization, Property 9: PlayerIdentity creation on authentication**
     * **Validates: Requirements 6.1**
     *
     * Property: For any external auth user (with provider and external ID),
     * the system should create a new PlayerIdentity if one doesn't exist,
     * or retrieve the existing one if it does.
     *
     * This property ensures that:
     * 1. Any valid external auth user can be converted to a PlayerIdentity
     * 2. Creating the same user twice returns the same identity (idempotent lookup)
     * 3. The created identity contains all required fields
     */
    it('should create or retrieve PlayerIdentity for any external auth user', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary external auth users
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            provider: fc.constantFrom('clerk', 'custom-oauth', 'auth0', 'github', 'google'),
            externalId: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.option(fc.emailAddress(), { nil: undefined }),
          }),
          async (externalUser) => {
            // Clear repository for each iteration to avoid collisions
            await repository.clear();

            // First creation should succeed
            const identity1 = await repository.create({
              name: externalUser.name,
              externalAuthProvider: externalUser.provider,
              externalAuthId: externalUser.externalId,
              email: externalUser.email,
            });

            // Verify identity has all required fields
            expect(identity1.id).toBeDefined();
            expect(typeof identity1.id).toBe('string');
            expect(identity1.id.length).toBeGreaterThan(0);
            expect(identity1.name).toBe(externalUser.name.trim());
            expect(identity1.externalAuthProvider).toBe(externalUser.provider);
            expect(identity1.externalAuthId).toBe(externalUser.externalId);
            expect(identity1.email).toBe(externalUser.email);
            expect(identity1.createdAt).toBeInstanceOf(Date);
            expect(identity1.lastUsed).toBeInstanceOf(Date);

            // Retrieving by external ID should return the same identity
            const retrieved = await repository.findByExternalId(
              externalUser.provider,
              externalUser.externalId
            );

            expect(retrieved).not.toBeNull();
            expect(retrieved?.id).toBe(identity1.id);
            expect(retrieved?.name).toBe(identity1.name);
            expect(retrieved?.externalAuthProvider).toBe(identity1.externalAuthProvider);
            expect(retrieved?.externalAuthId).toBe(identity1.externalAuthId);

            // Attempting to create again with same provider+externalId should fail
            await expect(
              repository.create({
                name: 'different-name',
                externalAuthProvider: externalUser.provider,
                externalAuthId: externalUser.externalId,
                email: 'different@example.com',
              })
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property: Different providers can have the same external ID
     * This ensures proper isolation between authentication providers
     */
    it('should allow same external ID for different providers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name1: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            name2: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            provider1: fc.constantFrom('clerk', 'custom-oauth', 'auth0'),
            provider2: fc.constantFrom('github', 'google', 'discord'),
            sharedExternalId: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (data) => {
            // Clear repository for each iteration to avoid collisions
            await repository.clear();

            // Create identity with provider1
            const identity1 = await repository.create({
              name: data.name1,
              externalAuthProvider: data.provider1,
              externalAuthId: data.sharedExternalId,
            });

            // Create identity with provider2 and same external ID
            const identity2 = await repository.create({
              name: data.name2,
              externalAuthProvider: data.provider2,
              externalAuthId: data.sharedExternalId,
            });

            // Should be different identities
            expect(identity1.id).not.toBe(identity2.id);
            expect(identity1.externalAuthProvider).not.toBe(identity2.externalAuthProvider);

            // Both should be retrievable by their respective provider+externalId
            const retrieved1 = await repository.findByExternalId(
              data.provider1,
              data.sharedExternalId
            );
            const retrieved2 = await repository.findByExternalId(
              data.provider2,
              data.sharedExternalId
            );

            expect(retrieved1?.id).toBe(identity1.id);
            expect(retrieved2?.id).toBe(identity2.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: PlayerIdentity creation is deterministic for the same input
     * (within the same repository instance)
     */
    it('should maintain referential integrity for lookups', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            provider: fc.constantFrom('clerk', 'custom-oauth', 'auth0'),
            externalId: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (user) => {
            // Clear repository for each iteration to avoid collisions
            await repository.clear();

            // Create identity
            const created = await repository.create({
              name: user.name,
              externalAuthProvider: user.provider,
              externalAuthId: user.externalId,
            });

            // Multiple lookups should return the same identity
            const lookup1 = await repository.findByExternalId(user.provider, user.externalId);
            const lookup2 = await repository.findByExternalId(user.provider, user.externalId);
            const lookup3 = await repository.findByExternalId(user.provider, user.externalId);

            expect(lookup1?.id).toBe(created.id);
            expect(lookup2?.id).toBe(created.id);
            expect(lookup3?.id).toBe(created.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
