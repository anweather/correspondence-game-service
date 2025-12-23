/**
 * Tests for Yahtzee metadata module
 * 
 * Following TDD approach - these tests will initially fail until
 * the metadata module is properly implemented in task 3.2
 */

import {
  getGameType,
  getGameName,
  getMinPlayers,
  getMaxPlayers,
  getDescription,
} from '../metadata';

describe('Yahtzee Metadata', () => {
  describe('getGameType', () => {
    it('should return correct game type identifier', () => {
      expect(getGameType()).toBe('yahtzee');
    });
  });

  describe('getGameName', () => {
    it('should return human-readable game name', () => {
      expect(getGameName()).toBe('Yahtzee');
    });
  });

  describe('getMinPlayers', () => {
    it('should allow minimum 1 player for solo play', () => {
      expect(getMinPlayers()).toBe(1);
    });
  });

  describe('getMaxPlayers', () => {
    it('should allow maximum 8 players', () => {
      expect(getMaxPlayers()).toBe(8);
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
      expect(description.toLowerCase()).toContain('dice');
      expect(description.toLowerCase()).toContain('scoring');
      expect(description.toLowerCase()).toContain('scorecard');
    });

    it('should mention the number of categories', () => {
      const description = getDescription();
      expect(description).toContain('13');
    });
  });

  describe('player limit validation', () => {
    it('should have valid player range', () => {
      const min = getMinPlayers();
      const max = getMaxPlayers();
      
      expect(min).toBeGreaterThan(0);
      expect(max).toBeGreaterThanOrEqual(min);
      expect(max).toBeLessThanOrEqual(8); // Based on requirements
    });
  });
});