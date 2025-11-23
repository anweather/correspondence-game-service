/**
 * Tests for Tic-Tac-Toe metadata module
 */

import {
  getGameType,
  getGameName,
  getMinPlayers,
  getMaxPlayers,
  getDescription,
} from '../metadata';

describe('TicTacToe Metadata', () => {
  describe('getGameType', () => {
    it('should return correct game type identifier', () => {
      expect(getGameType()).toBe('tic-tac-toe');
    });
  });

  describe('getGameName', () => {
    it('should return human-readable game name', () => {
      expect(getGameName()).toBe('Tic-Tac-Toe');
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
    it('should return game description', () => {
      const description = getDescription();
      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should include key game information', () => {
      const description = getDescription();
      expect(description.toLowerCase()).toContain('tic-tac-toe');
      expect(description.toLowerCase()).toContain('3x3');
    });
  });
});
