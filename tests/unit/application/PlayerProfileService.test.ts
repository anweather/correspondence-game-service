import { PlayerProfileService } from '@application/services/PlayerProfileService';
import { IPlayerProfileRepository } from '@domain/interfaces/IPlayerProfileRepository';
import { PlayerProfile } from '@domain/models/PlayerProfile';

describe('PlayerProfileService', () => {
  let service: PlayerProfileService;
  let mockRepository: jest.Mocked<IPlayerProfileRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findByDisplayName: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isDisplayNameAvailable: jest.fn(),
      findAll: jest.fn(),
    };

    service = new PlayerProfileService(mockRepository);
  });

  describe('createProfile', () => {
    it('should create a profile with provided display name', async () => {
      const userId = 'user_123';
      const displayName = 'john_doe';
      const expectedProfile: PlayerProfile = {
        userId,
        displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(expectedProfile);

      const result = await service.createProfile(userId, displayName);

      expect(result).toEqual(expectedProfile);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        displayName,
      });
    });

    it('should generate default display name when none provided', async () => {
      const userId = 'user_456';
      const defaultName = 'player1';
      const expectedProfile: PlayerProfile = {
        userId,
        displayName: defaultName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the repository to check for existing default names
      mockRepository.isDisplayNameAvailable.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(expectedProfile);

      const result = await service.createProfile(userId);

      expect(result.displayName).toMatch(/^player\d+$/);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should generate unique default display name when collisions occur', async () => {
      const userId = 'user_789';

      // Simulate collisions for player1 and player2, success on player3
      mockRepository.isDisplayNameAvailable
        .mockResolvedValueOnce(false) // player1 taken
        .mockResolvedValueOnce(false) // player2 taken
        .mockResolvedValueOnce(true); // player3 available

      const expectedProfile: PlayerProfile = {
        userId,
        displayName: 'player3',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(expectedProfile);

      const result = await service.createProfile(userId);

      expect(result.displayName).toBe('player3');
      expect(mockRepository.isDisplayNameAvailable).toHaveBeenCalledTimes(3);
    });

    it('should reject invalid display name (too short)', async () => {
      const userId = 'user_123';
      const invalidName = 'ab'; // Only 2 characters

      await expect(service.createProfile(userId, invalidName)).rejects.toThrow(
        'Display name must be between 3 and 20 characters'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject invalid display name (too long)', async () => {
      const userId = 'user_123';
      const invalidName = 'a'.repeat(21); // 21 characters

      await expect(service.createProfile(userId, invalidName)).rejects.toThrow(
        'Display name must be between 3 and 20 characters'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject invalid display name (invalid characters)', async () => {
      const userId = 'user_123';
      const invalidName = 'john-doe!'; // Contains hyphen and exclamation

      await expect(service.createProfile(userId, invalidName)).rejects.toThrow(
        'Display name can only contain letters, numbers, and underscores'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reserved display name (admin)', async () => {
      const userId = 'user_123';
      const reservedName = 'admin';

      await expect(service.createProfile(userId, reservedName)).rejects.toThrow(
        'Display name is reserved and cannot be used'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reserved display name (system)', async () => {
      const userId = 'user_123';
      const reservedName = 'system';

      await expect(service.createProfile(userId, reservedName)).rejects.toThrow(
        'Display name is reserved and cannot be used'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reserved display name (bot)', async () => {
      const userId = 'user_123';
      const reservedName = 'bot';

      await expect(service.createProfile(userId, reservedName)).rejects.toThrow(
        'Display name is reserved and cannot be used'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reserved display name case-insensitively', async () => {
      const userId = 'user_123';
      const reservedName = 'ADMIN'; // Uppercase

      await expect(service.createProfile(userId, reservedName)).rejects.toThrow(
        'Display name is reserved and cannot be used'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return profile when found', async () => {
      const userId = 'user_123';
      const expectedProfile: PlayerProfile = {
        userId,
        displayName: 'john_doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByUserId.mockResolvedValue(expectedProfile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(expectedProfile);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should return null when profile not found', async () => {
      const userId = 'user_nonexistent';

      mockRepository.findByUserId.mockResolvedValue(null);

      const result = await service.getProfile(userId);

      expect(result).toBeNull();
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateDisplayName', () => {
    it('should update display name successfully', async () => {
      const userId = 'user_123';
      const newDisplayName = 'jane_smith';
      const updatedProfile: PlayerProfile = {
        userId,
        displayName: newDisplayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.update.mockResolvedValue(updatedProfile);

      const result = await service.updateDisplayName(userId, newDisplayName);

      expect(result).toEqual(updatedProfile);
      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        displayName: newDisplayName,
      });
    });

    it('should reject invalid display name during update (too short)', async () => {
      const userId = 'user_123';
      const invalidName = 'ab';

      await expect(service.updateDisplayName(userId, invalidName)).rejects.toThrow(
        'Display name must be between 3 and 20 characters'
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject invalid display name during update (too long)', async () => {
      const userId = 'user_123';
      const invalidName = 'a'.repeat(21);

      await expect(service.updateDisplayName(userId, invalidName)).rejects.toThrow(
        'Display name must be between 3 and 20 characters'
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject invalid display name during update (invalid characters)', async () => {
      const userId = 'user_123';
      const invalidName = 'jane@smith';

      await expect(service.updateDisplayName(userId, invalidName)).rejects.toThrow(
        'Display name can only contain letters, numbers, and underscores'
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject reserved display name during update', async () => {
      const userId = 'user_123';
      const reservedName = 'moderator';

      await expect(service.updateDisplayName(userId, reservedName)).rejects.toThrow(
        'Display name is reserved and cannot be used'
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('validateDisplayName', () => {
    it('should return true for valid display name', () => {
      expect(service.validateDisplayName('john_doe')).toBe(true);
      expect(service.validateDisplayName('player123')).toBe(true);
      expect(service.validateDisplayName('abc')).toBe(true); // Minimum length
      expect(service.validateDisplayName('a'.repeat(20))).toBe(true); // Maximum length
    });

    it('should return false for display name too short', () => {
      expect(service.validateDisplayName('ab')).toBe(false);
      expect(service.validateDisplayName('a')).toBe(false);
      expect(service.validateDisplayName('')).toBe(false);
    });

    it('should return false for display name too long', () => {
      expect(service.validateDisplayName('a'.repeat(21))).toBe(false);
      expect(service.validateDisplayName('a'.repeat(50))).toBe(false);
    });

    it('should return false for display name with invalid characters', () => {
      expect(service.validateDisplayName('john-doe')).toBe(false); // Hyphen
      expect(service.validateDisplayName('john.doe')).toBe(false); // Period
      expect(service.validateDisplayName('john doe')).toBe(false); // Space
      expect(service.validateDisplayName('john@doe')).toBe(false); // At sign
      expect(service.validateDisplayName('john!doe')).toBe(false); // Exclamation
    });

    it('should return false for reserved display names', () => {
      expect(service.validateDisplayName('admin')).toBe(false);
      expect(service.validateDisplayName('system')).toBe(false);
      expect(service.validateDisplayName('bot')).toBe(false);
      expect(service.validateDisplayName('moderator')).toBe(false);
    });

    it('should return false for reserved display names case-insensitively', () => {
      expect(service.validateDisplayName('ADMIN')).toBe(false);
      expect(service.validateDisplayName('Admin')).toBe(false);
      expect(service.validateDisplayName('SyStEm')).toBe(false);
      expect(service.validateDisplayName('BOT')).toBe(false);
    });
  });

  describe('generateDefaultDisplayName', () => {
    it('should generate display name in correct format', async () => {
      mockRepository.isDisplayNameAvailable.mockResolvedValue(true);

      const result = await service.generateDefaultDisplayName();

      expect(result).toMatch(/^player\d+$/);
    });

    it('should generate unique display names on subsequent calls', async () => {
      mockRepository.isDisplayNameAvailable
        .mockResolvedValueOnce(false) // First attempt taken
        .mockResolvedValueOnce(true); // Second attempt available

      const result = await service.generateDefaultDisplayName();

      expect(result).toMatch(/^player\d+$/);
      expect(mockRepository.isDisplayNameAvailable).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple collisions', async () => {
      // Simulate 5 collisions before finding available name
      mockRepository.isDisplayNameAvailable
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.generateDefaultDisplayName();

      expect(result).toMatch(/^player\d+$/);
      expect(mockRepository.isDisplayNameAvailable).toHaveBeenCalledTimes(6);
    });
  });
});
