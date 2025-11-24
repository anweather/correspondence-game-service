import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';

describe('InMemoryPlayerIdentityRepository', () => {
  let repository: InMemoryPlayerIdentityRepository;

  beforeEach(() => {
    repository = new InMemoryPlayerIdentityRepository();
  });

  describe('findByExternalId', () => {
    it('should find player by external auth provider and ID', async () => {
      // Create a player with external auth
      const created = await repository.create({
        name: 'testuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_123',
        email: 'test@example.com',
      });

      // Find by external ID
      const found = await repository.findByExternalId('clerk', 'clerk_user_123');

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.externalAuthProvider).toBe('clerk');
      expect(found?.externalAuthId).toBe('clerk_user_123');
    });

    it('should return null when player not found', async () => {
      const found = await repository.findByExternalId('clerk', 'nonexistent_user');

      expect(found).toBeNull();
    });

    it('should distinguish between different providers', async () => {
      // Create players with same external ID but different providers
      await repository.create({
        name: 'clerkuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'user_123',
        email: 'clerk@example.com',
      });

      await repository.create({
        name: 'oauthuser',
        externalAuthProvider: 'custom-oauth',
        externalAuthId: 'user_123',
        email: 'oauth@example.com',
      });

      const clerkUser = await repository.findByExternalId('clerk', 'user_123');
      const oauthUser = await repository.findByExternalId('custom-oauth', 'user_123');

      expect(clerkUser?.name).toBe('clerkuser');
      expect(oauthUser?.name).toBe('oauthuser');
      expect(clerkUser?.id).not.toBe(oauthUser?.id);
    });

    it('should handle case sensitivity in provider names', async () => {
      await repository.create({
        name: 'testuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'user_abc',
      });

      // Provider names should be case-sensitive
      const found = await repository.findByExternalId('clerk', 'user_abc');
      const notFound = await repository.findByExternalId('CLERK', 'user_abc');

      expect(found).toBeDefined();
      expect(notFound).toBeNull();
    });
  });

  describe('create with external auth fields', () => {
    it('should create player with external auth provider', async () => {
      const identity = await repository.create({
        name: 'newuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_new',
        email: 'new@example.com',
      });

      expect(identity.id).toBeDefined();
      expect(identity.name).toBe('newuser');
      expect(identity.externalAuthProvider).toBe('clerk');
      expect(identity.externalAuthId).toBe('clerk_user_new');
      expect(identity.email).toBe('new@example.com');
      expect(identity.createdAt).toBeInstanceOf(Date);
      expect(identity.lastUsed).toBeInstanceOf(Date);
    });

    it('should create player without email', async () => {
      const identity = await repository.create({
        name: 'noemailuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_noemail',
      });

      expect(identity.email).toBeUndefined();
    });

    it('should maintain backward compatibility for non-auth players', async () => {
      const identity = await repository.create({
        name: 'legacyuser',
      });

      expect(identity.id).toBeDefined();
      expect(identity.name).toBe('legacyuser');
      expect(identity.externalAuthProvider).toBeUndefined();
      expect(identity.externalAuthId).toBeUndefined();
    });

    it('should generate unique IDs for each player', async () => {
      const identity1 = await repository.create({
        name: 'user1',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_1',
      });

      const identity2 = await repository.create({
        name: 'user2',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_2',
      });

      expect(identity1.id).not.toBe(identity2.id);
    });

    it('should prevent duplicate external auth IDs for same provider', async () => {
      await repository.create({
        name: 'firstuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_duplicate',
      });

      // Attempting to create another player with same provider + externalId should fail
      await expect(
        repository.create({
          name: 'seconduser',
          externalAuthProvider: 'clerk',
          externalAuthId: 'clerk_user_duplicate',
        })
      ).rejects.toThrow();
    });

    it('should allow same external ID for different providers', async () => {
      const clerk = await repository.create({
        name: 'clerkuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'user_same',
      });

      const oauth = await repository.create({
        name: 'oauthuser',
        externalAuthProvider: 'custom-oauth',
        externalAuthId: 'user_same',
      });

      expect(clerk.id).not.toBe(oauth.id);
      expect(clerk.externalAuthId).toBe(oauth.externalAuthId);
    });
  });

  describe('existing methods compatibility', () => {
    it('should maintain getOrCreate functionality', async () => {
      const identity = await repository.getOrCreate('existinguser');

      expect(identity.name).toBe('existinguser');
      expect(identity.id).toBeDefined();
    });

    it('should maintain findByName functionality', async () => {
      await repository.create({
        name: 'nameduser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_named',
      });

      const found = await repository.findByName('nameduser');

      expect(found).toBeDefined();
      expect(found?.name).toBe('nameduser');
    });

    it('should maintain findAll functionality', async () => {
      await repository.create({
        name: 'user1',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_1',
      });

      await repository.create({
        name: 'user2',
      });

      const all = await repository.findAll();

      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });
});
