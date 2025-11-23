/**
 * Tests for Connect Four metadata module
 * Requirements: 10.2, 10.3, 10.4, 10.5
 */

import {
  getGameType,
  getGameName,
  getMinPlayers,
  getMaxPlayers,
  getDescription,
} from '../metadata';

describe('ConnectFour Metadata', () => {
  describe('getGameType', () => {
    it('should return correct game type identifier', () => {
      expect(getGameType()).toBe('connect-four');
    });
  });

  describe('getGameName', () => {
    it('should return human-readable game name', () => {
      expect(getGameName()).toBe('Connect Four');
    });
  });

  describe('getMinPlayers', () => {
    it('should require minimum 2 players', () => {
      expect(getMinPlayers()).toBe(2);
    });
  });

  describe('getMaxPlayers', () => {
    it('should allow maximum 2 players', () => {
      expect(getMaxPlayers()).toBe(2);
    });
  });

  describe('getDescription', () => {
    it('should return non-empty string', () => {
      const description = getDescription();
      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should include key game information', () => {
      const description = getDescription();
      expect(description.toLowerCase()).toContain('connect four');
    });
  });
});
