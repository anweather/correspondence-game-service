import { ClerkAuthenticationService } from '@adapters/rest/auth/clerk/ClerkAuthenticationService';
import { ExternalAuthUser } from '@domain/interfaces/authentication';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';

// Mock the Clerk SDK
jest.mock('@clerk/express', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
}));

import { clerkClient } from '@clerk/express';

describe('ClerkAuthenticationService', () => {
  let service: ClerkAuthenticationService;
  let repository: InMemoryPlayerIdentityRepository;

  beforeEach(() => {
    repository = new InMemoryPlayerIdentityRepository();
    service = new ClerkAuthenticationService(repository);
    jest.clearAllMocks();
  });

  describe('findOrCreatePlayer', () => {
    it('should create a new player when one does not exist', async () => {
      const externalUser: ExternalAuthUser = {
        id: 'clerk_user_123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const player = await service.findOrCreatePlayer(externalUser);

      expect(player).toBeDefined();
      expect(player.name).toBe('testuser');
      expect(player.externalAuthProvider).toBe('clerk');
      expect(player.externalAuthId).toBe('clerk_user_123');
      expect(player.email).toBe('test@example.com');
      expect(player.id).toBeDefined();
      expect(player.createdAt).toBeInstanceOf(Date);
      expect(player.lastUsed).toBeInstanceOf(Date);
    });

    it('should retrieve existing player when one exists', async () => {
      const externalUser: ExternalAuthUser = {
        id: 'clerk_user_456',
        username: 'existinguser',
        email: 'existing@example.com',
      };

      // Create player first
      const firstPlayer = await service.findOrCreatePlayer(externalUser);
      const firstPlayerId = firstPlayer.id;
      const firstCreatedAt = firstPlayer.createdAt;

      // Try to create again - should retrieve existing
      const secondPlayer = await service.findOrCreatePlayer(externalUser);

      expect(secondPlayer.id).toBe(firstPlayerId);
      expect(secondPlayer.createdAt).toEqual(firstCreatedAt);
      expect(secondPlayer.externalAuthId).toBe('clerk_user_456');
    });

    it('should handle external user without email', async () => {
      const externalUser: ExternalAuthUser = {
        id: 'clerk_user_789',
        username: 'noemail',
      };

      const player = await service.findOrCreatePlayer(externalUser);

      expect(player).toBeDefined();
      expect(player.name).toBe('noemail');
      expect(player.email).toBeUndefined();
    });
  });

  describe('getUserById', () => {
    it('should return user data for valid Clerk user ID', async () => {
      const mockClerkUser = {
        id: 'clerk_user_valid',
        username: 'validuser',
        emailAddresses: [{ emailAddress: 'valid@example.com' }],
        firstName: 'Valid',
        lastName: 'User',
      };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

      const result = await service.getUserById('clerk_user_valid');

      expect(result).toBeDefined();
      expect(result?.id).toBe('clerk_user_valid');
      expect(result?.username).toBe('validuser');
      expect(result?.email).toBe('valid@example.com');
      expect(result?.firstName).toBe('Valid');
      expect(result?.lastName).toBe('User');
      expect(clerkClient.users.getUser).toHaveBeenCalledWith('clerk_user_valid');
    });

    it('should return null for invalid Clerk user ID', async () => {
      (clerkClient.users.getUser as jest.Mock).mockRejectedValue(new Error('User not found'));

      const result = await service.getUserById('invalid_user_id');

      expect(result).toBeNull();
      expect(clerkClient.users.getUser).toHaveBeenCalledWith('invalid_user_id');
    });

    it('should handle Clerk user without username', async () => {
      const mockClerkUser = {
        id: 'clerk_user_no_username',
        username: null,
        emailAddresses: [{ emailAddress: 'nousername@example.com' }],
        firstName: null,
        lastName: null,
      };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

      const result = await service.getUserById('clerk_user_no_username');

      expect(result).toBeDefined();
      expect(result?.username).toBe('nousername@example.com'); // Should fall back to email
    });

    it('should handle Clerk user without email', async () => {
      const mockClerkUser = {
        id: 'clerk_user_no_email',
        username: 'usernoemail',
        emailAddresses: [],
        firstName: null,
        lastName: null,
      };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

      const result = await service.getUserById('clerk_user_no_email');

      expect(result).toBeDefined();
      expect(result?.username).toBe('usernoemail');
      expect(result?.email).toBeUndefined();
    });

    it('should handle Clerk user with neither username nor email', async () => {
      const mockClerkUser = {
        id: 'clerk_user_minimal',
        username: null,
        emailAddresses: [],
        firstName: null,
        lastName: null,
      };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

      const result = await service.getUserById('clerk_user_minimal');

      expect(result).toBeDefined();
      expect(result?.username).toBe('user'); // Should fall back to 'user'
    });
  });

  describe('Clerk User mapping to domain types', () => {
    it('should correctly map all Clerk user fields to ExternalAuthUser', async () => {
      const mockClerkUser = {
        id: 'clerk_full_user',
        username: 'fulluser',
        emailAddresses: [
          { emailAddress: 'primary@example.com' },
          { emailAddress: 'secondary@example.com' },
        ],
        firstName: 'Full',
        lastName: 'User',
      };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

      const result = await service.getUserById('clerk_full_user');

      expect(result).toEqual({
        id: 'clerk_full_user',
        username: 'fulluser',
        email: 'primary@example.com', // Should use first email
        firstName: 'Full',
        lastName: 'User',
      });
    });

    it('should map Clerk user to PlayerIdentity with correct provider', async () => {
      const externalUser: ExternalAuthUser = {
        id: 'clerk_mapping_test',
        username: 'mappingtest',
        email: 'mapping@example.com',
        firstName: 'Mapping',
        lastName: 'Test',
      };

      const player = await service.findOrCreatePlayer(externalUser);

      expect(player.externalAuthProvider).toBe('clerk');
      expect(player.externalAuthId).toBe('clerk_mapping_test');
      expect(player.name).toBe('mappingtest');
      expect(player.email).toBe('mapping@example.com');
    });
  });
});
