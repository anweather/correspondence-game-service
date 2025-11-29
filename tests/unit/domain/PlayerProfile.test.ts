import { PlayerProfile, validateDisplayName, generateDefaultDisplayName } from '@domain/models/PlayerProfile';

describe('PlayerProfile', () => {
  describe('Model Creation', () => {
    it('should create a valid PlayerProfile with all required fields', () => {
      const profile: PlayerProfile = {
        userId: 'user_123',
        displayName: 'player42',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      expect(profile.userId).toBe('user_123');
      expect(profile.displayName).toBe('player42');
      expect(profile.createdAt).toEqual(new Date('2024-01-01'));
      expect(profile.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should allow display names with alphanumeric characters', () => {
      const profile: PlayerProfile = {
        userId: 'user_123',
        displayName: 'player123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(profile.displayName).toBe('player123');
    });

    it('should allow display names with underscores', () => {
      const profile: PlayerProfile = {
        userId: 'user_123',
        displayName: 'player_name',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(profile.displayName).toBe('player_name');
    });
  });

  describe('Display Name Validation', () => {
    it('should accept valid display names with 3-20 characters', () => {
      expect(validateDisplayName('abc')).toBe(true);
      expect(validateDisplayName('player123')).toBe(true);
      expect(validateDisplayName('a'.repeat(20))).toBe(true);
    });

    it('should accept display names with alphanumeric and underscores', () => {
      expect(validateDisplayName('player_123')).toBe(true);
      expect(validateDisplayName('user_name_42')).toBe(true);
      expect(validateDisplayName('ABC_123')).toBe(true);
    });

    it('should reject display names shorter than 3 characters', () => {
      expect(validateDisplayName('ab')).toBe(false);
      expect(validateDisplayName('a')).toBe(false);
      expect(validateDisplayName('')).toBe(false);
    });

    it('should reject display names longer than 20 characters', () => {
      expect(validateDisplayName('a'.repeat(21))).toBe(false);
      expect(validateDisplayName('a'.repeat(50))).toBe(false);
    });

    it('should reject display names with special characters', () => {
      expect(validateDisplayName('player@123')).toBe(false);
      expect(validateDisplayName('player-name')).toBe(false);
      expect(validateDisplayName('player.name')).toBe(false);
      expect(validateDisplayName('player name')).toBe(false);
      expect(validateDisplayName('player!123')).toBe(false);
    });

    it('should reject reserved names (case-insensitive)', () => {
      expect(validateDisplayName('admin')).toBe(false);
      expect(validateDisplayName('Admin')).toBe(false);
      expect(validateDisplayName('ADMIN')).toBe(false);
      expect(validateDisplayName('system')).toBe(false);
      expect(validateDisplayName('System')).toBe(false);
      expect(validateDisplayName('bot')).toBe(false);
      expect(validateDisplayName('Bot')).toBe(false);
      expect(validateDisplayName('moderator')).toBe(false);
    });

    it('should accept names that contain reserved words but are not exact matches', () => {
      expect(validateDisplayName('administrator')).toBe(true);
      expect(validateDisplayName('botmaster')).toBe(true);
      expect(validateDisplayName('system32')).toBe(true);
    });
  });

  describe('Default Display Name Generation', () => {
    it('should generate display name in format player{number}', () => {
      const name = generateDefaultDisplayName(1);
      expect(name).toBe('player1');
    });

    it('should generate sequential display names', () => {
      expect(generateDefaultDisplayName(1)).toBe('player1');
      expect(generateDefaultDisplayName(2)).toBe('player2');
      expect(generateDefaultDisplayName(42)).toBe('player42');
      expect(generateDefaultDisplayName(999)).toBe('player999');
    });

    it('should handle large numbers', () => {
      expect(generateDefaultDisplayName(10000)).toBe('player10000');
    });
  });
});
