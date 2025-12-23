/**
 * Shared Types Test
 * 
 * Verifies that Yahtzee-specific types and constants are properly defined
 * and follow the established patterns.
 */

import { 
  YahtzeeCategory, 
  isYahtzeeMove, 
  isRollParameters, 
  isScoreParameters,
  YahtzeeMove,
  RollParameters,
  ScoreParameters
} from '../types';

import { 
  GAME_TYPE, 
  MIN_PLAYERS, 
  MAX_PLAYERS, 
  DICE_COUNT, 
  DICE_SIDES,
  ALL_CATEGORIES,
  UPPER_SECTION_CATEGORIES,
  LOWER_SECTION_CATEGORIES,
  CATEGORY_NAMES,
  CATEGORY_DESCRIPTIONS
} from '../constants';

describe('Yahtzee Types and Constants', () => {
  describe('Constants', () => {
    it('should have correct game metadata', () => {
      expect(GAME_TYPE).toBe('yahtzee');
      expect(MIN_PLAYERS).toBe(1);
      expect(MAX_PLAYERS).toBe(8);
      expect(DICE_COUNT).toBe(5);
      expect(DICE_SIDES).toBe(6);
    });

    it('should have all 13 categories defined', () => {
      expect(ALL_CATEGORIES).toHaveLength(13);
      expect(UPPER_SECTION_CATEGORIES).toHaveLength(6);
      expect(LOWER_SECTION_CATEGORIES).toHaveLength(7);
    });

    it('should have category names and descriptions for all categories', () => {
      ALL_CATEGORIES.forEach(category => {
        expect(CATEGORY_NAMES[category]).toBeDefined();
        expect(CATEGORY_DESCRIPTIONS[category]).toBeDefined();
        expect(typeof CATEGORY_NAMES[category]).toBe('string');
        expect(typeof CATEGORY_DESCRIPTIONS[category]).toBe('string');
      });
    });
  });

  describe('YahtzeeCategory Enum', () => {
    it('should contain all expected categories', () => {
      const expectedCategories = [
        'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
        'three_of_a_kind', 'four_of_a_kind', 'full_house',
        'small_straight', 'large_straight', 'yahtzee', 'chance'
      ];
      
      expectedCategories.forEach(category => {
        expect(Object.values(YahtzeeCategory)).toContain(category);
      });
    });
  });

  describe('Type Guards', () => {
    describe('isYahtzeeMove', () => {
      it('should return true for valid roll moves', () => {
        const rollMove: YahtzeeMove = {
          playerId: 'player1',
          timestamp: new Date(),
          action: 'roll',
          parameters: { keepDice: [true, false, true, false, true] }
        };
        expect(isYahtzeeMove(rollMove)).toBe(true);
      });

      it('should return true for valid score moves', () => {
        const scoreMove: YahtzeeMove = {
          playerId: 'player1',
          timestamp: new Date(),
          action: 'score',
          parameters: { category: YahtzeeCategory.ONES }
        };
        expect(isYahtzeeMove(scoreMove)).toBe(true);
      });

      it('should return false for invalid moves', () => {
        expect(isYahtzeeMove(null)).toBe(false);
        expect(isYahtzeeMove({})).toBe(false);
        expect(isYahtzeeMove({ action: 'invalid' })).toBe(false);
        expect(isYahtzeeMove({ 
          playerId: 'player1', 
          timestamp: new Date(), 
          action: 'invalid', 
          parameters: {} 
        })).toBe(false);
      });
    });

    describe('isRollParameters', () => {
      it('should return true for valid roll parameters', () => {
        const params: RollParameters = {
          keepDice: [true, false, true, false, true]
        };
        expect(isRollParameters(params)).toBe(true);
      });

      it('should return false for invalid parameters', () => {
        expect(isRollParameters(null)).toBe(false);
        expect(isRollParameters({})).toBe(false);
        expect(isRollParameters({ keepDice: [true, false] })).toBe(false); // wrong length
        expect(isRollParameters({ keepDice: 'invalid' })).toBe(false);
      });
    });

    describe('isScoreParameters', () => {
      it('should return true for valid score parameters', () => {
        const params: ScoreParameters = {
          category: YahtzeeCategory.YAHTZEE
        };
        expect(isScoreParameters(params)).toBe(true);
      });

      it('should return false for invalid parameters', () => {
        expect(isScoreParameters(null)).toBe(false);
        expect(isScoreParameters({})).toBe(false);
        expect(isScoreParameters({ category: 'invalid' })).toBe(false);
      });
    });
  });
});