import { PlayerIdentity } from '@domain/models/PlayerIdentity';

describe('PlayerIdentity Model', () => {
  describe('External Auth Fields', () => {
    it('should create PlayerIdentity with external auth provider', () => {
      const identity: PlayerIdentity = {
        id: 'player-123',
        name: 'testuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_abc123',
        email: 'test@example.com',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      expect(identity.externalAuthProvider).toBe('clerk');
      expect(identity.externalAuthId).toBe('clerk_user_abc123');
      expect(identity.email).toBe('test@example.com');
    });

    it('should create PlayerIdentity with custom-oauth provider', () => {
      const identity: PlayerIdentity = {
        id: 'player-456',
        name: 'oauthuser',
        externalAuthProvider: 'custom-oauth',
        externalAuthId: 'oauth_user_xyz789',
        email: 'oauth@example.com',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      expect(identity.externalAuthProvider).toBe('custom-oauth');
      expect(identity.externalAuthId).toBe('oauth_user_xyz789');
    });

    it('should allow optional email field', () => {
      const identityWithEmail: PlayerIdentity = {
        id: 'player-789',
        name: 'user-with-email',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_def456',
        email: 'user@example.com',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      const identityWithoutEmail: PlayerIdentity = {
        id: 'player-101',
        name: 'user-no-email',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_ghi789',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      expect(identityWithEmail.email).toBe('user@example.com');
      expect(identityWithoutEmail.email).toBeUndefined();
    });

    it('should maintain backward compatibility with non-auth identities', () => {
      // Old-style identity without external auth fields
      const legacyIdentity: PlayerIdentity = {
        id: 'player-legacy',
        name: 'legacyuser',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      expect(legacyIdentity.id).toBe('player-legacy');
      expect(legacyIdentity.name).toBe('legacyuser');
      expect(legacyIdentity.externalAuthProvider).toBeUndefined();
      expect(legacyIdentity.externalAuthId).toBeUndefined();
    });

    it('should support various provider types', () => {
      const providers = ['clerk', 'custom-oauth', 'auth0', 'firebase'];

      providers.forEach((provider) => {
        const identity: PlayerIdentity = {
          id: `player-${provider}`,
          name: `user-${provider}`,
          externalAuthProvider: provider,
          externalAuthId: `${provider}_user_123`,
          createdAt: new Date(),
          lastUsed: new Date(),
        };

        expect(identity.externalAuthProvider).toBe(provider);
      });
    });
  });

  describe('Field Validation', () => {
    it('should require id and name fields', () => {
      const identity: PlayerIdentity = {
        id: 'player-required',
        name: 'requireduser',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      expect(identity.id).toBeDefined();
      expect(identity.name).toBeDefined();
      expect(identity.createdAt).toBeInstanceOf(Date);
      expect(identity.lastUsed).toBeInstanceOf(Date);
    });

    it('should allow external auth fields to be optional for backward compatibility', () => {
      const identity: PlayerIdentity = {
        id: 'player-optional',
        name: 'optionaluser',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // TypeScript should allow this without external auth fields
      expect(identity).toBeDefined();
    });

    it('should require both provider and externalId when using external auth', () => {
      const identity: PlayerIdentity = {
        id: 'player-both',
        name: 'bothuser',
        externalAuthProvider: 'clerk',
        externalAuthId: 'clerk_user_both',
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // Both fields should be present together
      expect(identity.externalAuthProvider).toBeDefined();
      expect(identity.externalAuthId).toBeDefined();
    });
  });
});
