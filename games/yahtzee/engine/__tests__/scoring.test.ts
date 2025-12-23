/**
 * Unit tests for Yahtzee scoring module
 * 
 * Tests all 13 category calculations, upper section bonus logic,
 * and edge cases according to official Yahtzee rules.
 */

import { calculateScore, calculateUpperSectionBonus } from '../scoring';
import { YahtzeeCategory } from '../../shared/types';
import { 
  UPPER_SECTION_BONUS_THRESHOLD, 
  UPPER_SECTION_BONUS_POINTS,
  FULL_HOUSE_POINTS,
  SMALL_STRAIGHT_POINTS,
  LARGE_STRAIGHT_POINTS,
  YAHTZEE_POINTS
} from '../../shared/constants';

describe('Yahtzee Scoring Module', () => {
  describe('Upper Section Categories', () => {
    describe('Ones category', () => {
      it('should sum all dice showing 1', () => {
        expect(calculateScore(YahtzeeCategory.ONES, [1, 1, 1, 2, 3])).toBe(3);
        expect(calculateScore(YahtzeeCategory.ONES, [1, 2, 3, 4, 5])).toBe(1);
        expect(calculateScore(YahtzeeCategory.ONES, [2, 3, 4, 5, 6])).toBe(0);
        expect(calculateScore(YahtzeeCategory.ONES, [1, 1, 1, 1, 1])).toBe(5);
      });
    });

    describe('Twos category', () => {
      it('should sum all dice showing 2', () => {
        expect(calculateScore(YahtzeeCategory.TWOS, [2, 2, 2, 1, 3])).toBe(6);
        expect(calculateScore(YahtzeeCategory.TWOS, [1, 2, 3, 4, 5])).toBe(2);
        expect(calculateScore(YahtzeeCategory.TWOS, [1, 3, 4, 5, 6])).toBe(0);
        expect(calculateScore(YahtzeeCategory.TWOS, [2, 2, 2, 2, 2])).toBe(10);
      });
    });

    describe('Threes category', () => {
      it('should sum all dice showing 3', () => {
        expect(calculateScore(YahtzeeCategory.THREES, [3, 3, 3, 1, 2])).toBe(9);
        expect(calculateScore(YahtzeeCategory.THREES, [1, 2, 3, 4, 5])).toBe(3);
        expect(calculateScore(YahtzeeCategory.THREES, [1, 2, 4, 5, 6])).toBe(0);
        expect(calculateScore(YahtzeeCategory.THREES, [3, 3, 3, 3, 3])).toBe(15);
      });
    });

    describe('Fours category', () => {
      it('should sum all dice showing 4', () => {
        expect(calculateScore(YahtzeeCategory.FOURS, [4, 4, 4, 1, 2])).toBe(12);
        expect(calculateScore(YahtzeeCategory.FOURS, [1, 2, 3, 4, 5])).toBe(4);
        expect(calculateScore(YahtzeeCategory.FOURS, [1, 2, 3, 5, 6])).toBe(0);
        expect(calculateScore(YahtzeeCategory.FOURS, [4, 4, 4, 4, 4])).toBe(20);
      });
    });

    describe('Fives category', () => {
      it('should sum all dice showing 5', () => {
        expect(calculateScore(YahtzeeCategory.FIVES, [5, 5, 5, 1, 2])).toBe(15);
        expect(calculateScore(YahtzeeCategory.FIVES, [1, 2, 3, 4, 5])).toBe(5);
        expect(calculateScore(YahtzeeCategory.FIVES, [1, 2, 3, 4, 6])).toBe(0);
        expect(calculateScore(YahtzeeCategory.FIVES, [5, 5, 5, 5, 5])).toBe(25);
      });
    });

    describe('Sixes category', () => {
      it('should sum all dice showing 6', () => {
        expect(calculateScore(YahtzeeCategory.SIXES, [6, 6, 6, 1, 2])).toBe(18);
        expect(calculateScore(YahtzeeCategory.SIXES, [1, 2, 3, 4, 6])).toBe(6);
        expect(calculateScore(YahtzeeCategory.SIXES, [1, 2, 3, 4, 5])).toBe(0);
        expect(calculateScore(YahtzeeCategory.SIXES, [6, 6, 6, 6, 6])).toBe(30);
      });
    });
  });

  describe('Lower Section Categories', () => {
    describe('Three of a Kind', () => {
      it('should sum all dice when at least 3 dice match', () => {
        expect(calculateScore(YahtzeeCategory.THREE_OF_A_KIND, [3, 3, 3, 1, 2])).toBe(12); // 3+3+3+1+2
        expect(calculateScore(YahtzeeCategory.THREE_OF_A_KIND, [5, 5, 5, 5, 1])).toBe(21); // 5+5+5+5+1
        expect(calculateScore(YahtzeeCategory.THREE_OF_A_KIND, [6, 6, 6, 6, 6])).toBe(30); // All sixes
      });

      it('should return 0 when less than 3 dice match', () => {
        expect(calculateScore(YahtzeeCategory.THREE_OF_A_KIND, [1, 2, 3, 4, 5])).toBe(0);
        expect(calculateScore(YahtzeeCategory.THREE_OF_A_KIND, [1, 1, 2, 3, 4])).toBe(0);
        expect(calculateScore(YahtzeeCategory.THREE_OF_A_KIND, [1, 2, 2, 3, 4])).toBe(0);
      });
    });

    describe('Four of a Kind', () => {
      it('should sum all dice when at least 4 dice match', () => {
        expect(calculateScore(YahtzeeCategory.FOUR_OF_A_KIND, [3, 3, 3, 3, 2])).toBe(14); // 3+3+3+3+2
        expect(calculateScore(YahtzeeCategory.FOUR_OF_A_KIND, [5, 5, 5, 5, 5])).toBe(25); // All fives
        expect(calculateScore(YahtzeeCategory.FOUR_OF_A_KIND, [1, 1, 1, 1, 6])).toBe(10); // 1+1+1+1+6
      });

      it('should return 0 when less than 4 dice match', () => {
        expect(calculateScore(YahtzeeCategory.FOUR_OF_A_KIND, [1, 2, 3, 4, 5])).toBe(0);
        expect(calculateScore(YahtzeeCategory.FOUR_OF_A_KIND, [1, 1, 1, 2, 3])).toBe(0);
        expect(calculateScore(YahtzeeCategory.FOUR_OF_A_KIND, [2, 2, 2, 3, 4])).toBe(0);
      });
    });

    describe('Full House', () => {
      it('should return 25 points for valid full house (3 of one + 2 of another)', () => {
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [3, 3, 3, 2, 2])).toBe(FULL_HOUSE_POINTS);
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [1, 1, 6, 6, 6])).toBe(FULL_HOUSE_POINTS);
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [4, 4, 5, 5, 5])).toBe(FULL_HOUSE_POINTS);
      });

      it('should return 25 points for Yahtzee (5 of a kind counts as full house)', () => {
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [4, 4, 4, 4, 4])).toBe(FULL_HOUSE_POINTS);
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [1, 1, 1, 1, 1])).toBe(FULL_HOUSE_POINTS);
      });

      it('should return 0 for invalid combinations', () => {
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [1, 2, 3, 4, 5])).toBe(0);
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [1, 1, 2, 3, 4])).toBe(0);
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [1, 1, 1, 2, 3])).toBe(0);
        expect(calculateScore(YahtzeeCategory.FULL_HOUSE, [1, 1, 1, 1, 2])).toBe(0);
      });
    });

    describe('Small Straight', () => {
      it('should return 30 points for 4 consecutive numbers', () => {
        expect(calculateScore(YahtzeeCategory.SMALL_STRAIGHT, [1, 2, 3, 4, 6])).toBe(SMALL_STRAIGHT_POINTS);
        expect(calculateScore(YahtzeeCategory.SMALL_STRAIGHT, [2, 3, 4, 5, 1])).toBe(SMALL_STRAIGHT_POINTS);
        expect(calculateScore(YahtzeeCategory.SMALL_STRAIGHT, [3, 4, 5, 6, 1])).toBe(SMALL_STRAIGHT_POINTS);
        expect(calculateScore(YahtzeeCategory.SMALL_STRAIGHT, [1, 2, 3, 4, 5])).toBe(SMALL_STRAIGHT_POINTS);
      });

      it('should return 0 for non-consecutive sequences', () => {
        expect(calculateScore(YahtzeeCategory.SMALL_STRAIGHT, [1, 2, 4, 6, 6])).toBe(0); // No 4 consecutive numbers
        expect(calculateScore(YahtzeeCategory.SMALL_STRAIGHT, [1, 3, 5, 6, 2])).toBe(0); // No 4 consecutive numbers
        expect(calculateScore(YahtzeeCategory.SMALL_STRAIGHT, [1, 1, 3, 5, 6])).toBe(0); // No 4 consecutive numbers
      });
    });

    describe('Large Straight', () => {
      it('should return 40 points for 5 consecutive numbers', () => {
        expect(calculateScore(YahtzeeCategory.LARGE_STRAIGHT, [1, 2, 3, 4, 5])).toBe(LARGE_STRAIGHT_POINTS);
        expect(calculateScore(YahtzeeCategory.LARGE_STRAIGHT, [2, 3, 4, 5, 6])).toBe(LARGE_STRAIGHT_POINTS);
        expect(calculateScore(YahtzeeCategory.LARGE_STRAIGHT, [5, 4, 3, 2, 1])).toBe(LARGE_STRAIGHT_POINTS); // Order doesn't matter
      });

      it('should return 0 for non-consecutive sequences', () => {
        expect(calculateScore(YahtzeeCategory.LARGE_STRAIGHT, [1, 2, 3, 4, 6])).toBe(0);
        expect(calculateScore(YahtzeeCategory.LARGE_STRAIGHT, [1, 3, 4, 5, 6])).toBe(0);
        expect(calculateScore(YahtzeeCategory.LARGE_STRAIGHT, [1, 1, 2, 3, 4])).toBe(0);
        expect(calculateScore(YahtzeeCategory.LARGE_STRAIGHT, [2, 2, 3, 4, 5])).toBe(0);
      });
    });

    describe('Yahtzee', () => {
      it('should return 50 points when all 5 dice match', () => {
        expect(calculateScore(YahtzeeCategory.YAHTZEE, [1, 1, 1, 1, 1])).toBe(YAHTZEE_POINTS);
        expect(calculateScore(YahtzeeCategory.YAHTZEE, [3, 3, 3, 3, 3])).toBe(YAHTZEE_POINTS);
        expect(calculateScore(YahtzeeCategory.YAHTZEE, [6, 6, 6, 6, 6])).toBe(YAHTZEE_POINTS);
      });

      it('should return 0 when not all dice match', () => {
        expect(calculateScore(YahtzeeCategory.YAHTZEE, [1, 1, 1, 1, 2])).toBe(0);
        expect(calculateScore(YahtzeeCategory.YAHTZEE, [1, 2, 3, 4, 5])).toBe(0);
        expect(calculateScore(YahtzeeCategory.YAHTZEE, [3, 3, 3, 3, 4])).toBe(0);
      });
    });

    describe('Chance', () => {
      it('should sum all dice regardless of combination', () => {
        expect(calculateScore(YahtzeeCategory.CHANCE, [1, 2, 3, 4, 5])).toBe(15);
        expect(calculateScore(YahtzeeCategory.CHANCE, [6, 6, 6, 6, 6])).toBe(30);
        expect(calculateScore(YahtzeeCategory.CHANCE, [1, 1, 1, 1, 1])).toBe(5);
        expect(calculateScore(YahtzeeCategory.CHANCE, [2, 4, 1, 6, 3])).toBe(16);
      });
    });
  });

  describe('Upper Section Bonus', () => {
    it('should return 35 points when upper section total is 63 or more', () => {
      expect(calculateUpperSectionBonus(63)).toBe(UPPER_SECTION_BONUS_POINTS);
      expect(calculateUpperSectionBonus(70)).toBe(UPPER_SECTION_BONUS_POINTS);
      expect(calculateUpperSectionBonus(100)).toBe(UPPER_SECTION_BONUS_POINTS);
    });

    it('should return 0 points when upper section total is less than 63', () => {
      expect(calculateUpperSectionBonus(0)).toBe(0);
      expect(calculateUpperSectionBonus(30)).toBe(0);
      expect(calculateUpperSectionBonus(62)).toBe(0);
    });

    it('should handle edge case of exactly 63 points', () => {
      expect(calculateUpperSectionBonus(UPPER_SECTION_BONUS_THRESHOLD)).toBe(UPPER_SECTION_BONUS_POINTS);
    });
  });

  describe('Edge Cases and Invalid Input', () => {
    it('should handle empty dice array', () => {
      expect(calculateScore(YahtzeeCategory.ONES, [])).toBe(0);
      expect(calculateScore(YahtzeeCategory.CHANCE, [])).toBe(0);
    });

    it('should handle dice array with wrong length', () => {
      expect(calculateScore(YahtzeeCategory.ONES, [1, 2, 3])).toBe(1); // Should still work with partial array
      expect(calculateScore(YahtzeeCategory.CHANCE, [1, 2, 3, 4, 5, 6, 7])).toBe(28); // Should work with extra dice
    });

    it('should handle dice values outside 1-6 range', () => {
      expect(calculateScore(YahtzeeCategory.ONES, [0, 1, 2, 3, 4])).toBe(1); // Ignore invalid 0
      expect(calculateScore(YahtzeeCategory.SIXES, [1, 2, 3, 4, 7])).toBe(0); // Ignore invalid 7
      expect(calculateScore(YahtzeeCategory.CHANCE, [1, 2, 3, 4, 7])).toBe(17); // Sum includes invalid value
    });

    it('should handle negative upper section totals', () => {
      expect(calculateUpperSectionBonus(-10)).toBe(0);
      expect(calculateUpperSectionBonus(-1)).toBe(0);
    });
  });
});