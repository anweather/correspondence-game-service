/**
 * Property-based tests for Yahtzee scoring module
 * These tests verify universal properties that should hold across all inputs
 */

import * as fc from 'fast-check';
import { calculateScore, calculateUpperSectionBonus } from '../scoring';
import { YahtzeeCategory } from '../../shared/types';
import { 
  UPPER_SECTION_BONUS_THRESHOLD, 
  UPPER_SECTION_BONUS_POINTS,
  UPPER_SECTION_CATEGORIES
} from '../../shared/constants';

describe('Yahtzee Scoring - Property-Based Tests', () => {
  describe('Property 7: Upper Section Scoring and Bonus Calculation', () => {
    /**
     * **Feature: yahtzee-plugin, Property 7: Upper section scoring and bonus calculation**
     * **Validates: Requirements 3.2, 3.3, 7.1**
     *
     * Property: For any upper section category (Ones-Sixes), scoring should sum only 
     * matching dice values, and when the upper section total reaches 63+ points, 
     * exactly 35 bonus points should be awarded
     *
     * This property ensures that:
     * 1. Upper section categories only count matching dice values
     * 2. Non-matching dice values are ignored
     * 3. Bonus is awarded exactly when threshold is met or exceeded
     * 4. Bonus calculation is consistent across all totals
     */
    it('should correctly calculate upper section scores and bonus eligibility', async () => {
      await fc.assert(
        fc.property(
          // Generate arbitrary test parameters
          fc.record({
            dice: fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 0, maxLength: 10 }),
            category: fc.constantFrom(...UPPER_SECTION_CATEGORIES),
            upperSectionTotal: fc.integer({ min: 0, max: 200 }),
          }),
          (testData) => {
            const score = calculateScore(testData.category, testData.dice);
            const bonus = calculateUpperSectionBonus(testData.upperSectionTotal);

            // Property 1: Score should only count matching dice values
            const targetValue = getTargetValueForCategory(testData.category);
            const expectedScore = testData.dice
              .filter(die => die === targetValue)
              .reduce((sum, die) => sum + die, 0);
            
            expect(score).toBe(expectedScore);

            // Property 2: Score should never be negative
            expect(score).toBeGreaterThanOrEqual(0);

            // Property 3: Score should be a multiple of the target value (or zero)
            if (score > 0) {
              expect(score % targetValue).toBe(0);
            }

            // Property 4: Bonus calculation should be deterministic
            if (testData.upperSectionTotal >= UPPER_SECTION_BONUS_THRESHOLD) {
              expect(bonus).toBe(UPPER_SECTION_BONUS_POINTS);
            } else {
              expect(bonus).toBe(0);
            }

            // Property 5: Bonus should never be negative
            expect(bonus).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property: Upper section scoring should be consistent across different dice arrangements
     * This ensures that dice order doesn't affect scoring
     */
    it('should produce consistent scores regardless of dice order', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            dice: fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 8 }),
            category: fc.constantFrom(...UPPER_SECTION_CATEGORIES),
          }),
          (testData) => {
            // Create shuffled version of the same dice
            const shuffledDice = [...testData.dice].sort(() => Math.random() - 0.5);
            const reversedDice = [...testData.dice].reverse();

            const originalScore = calculateScore(testData.category, testData.dice);
            const shuffledScore = calculateScore(testData.category, shuffledDice);
            const reversedScore = calculateScore(testData.category, reversedDice);

            // Property: Order should not affect score
            expect(originalScore).toBe(shuffledScore);
            expect(originalScore).toBe(reversedScore);
            expect(shuffledScore).toBe(reversedScore);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Bonus threshold should be exact boundary
     * This ensures the bonus is awarded at exactly 63 points and above
     */
    it('should award bonus at exact threshold boundary', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: -50, max: 150 }),
          (total) => {
            const bonus = calculateUpperSectionBonus(total);

            // Property: Exact threshold behavior
            if (total === UPPER_SECTION_BONUS_THRESHOLD) {
              expect(bonus).toBe(UPPER_SECTION_BONUS_POINTS);
            } else if (total === UPPER_SECTION_BONUS_THRESHOLD - 1) {
              expect(bonus).toBe(0);
            } else if (total === UPPER_SECTION_BONUS_THRESHOLD + 1) {
              expect(bonus).toBe(UPPER_SECTION_BONUS_POINTS);
            }

            // Property: General rule
            if (total >= UPPER_SECTION_BONUS_THRESHOLD) {
              expect(bonus).toBe(UPPER_SECTION_BONUS_POINTS);
            } else {
              expect(bonus).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Upper section scoring should handle edge cases correctly
     * This ensures proper behavior with boundary values and empty inputs
     */
    it('should handle edge cases correctly', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...UPPER_SECTION_CATEGORIES),
          (category) => {
            // Property: Empty dice array should score 0
            expect(calculateScore(category, [])).toBe(0);

            // Property: Dice with no matching values should score 0
            const targetValue = getTargetValueForCategory(category);
            const nonMatchingDice = Array(5).fill(targetValue === 1 ? 6 : 1);
            expect(calculateScore(category, nonMatchingDice)).toBe(0);

            // Property: All matching dice should sum correctly
            const allMatchingDice = Array(5).fill(targetValue);
            expect(calculateScore(category, allMatchingDice)).toBe(targetValue * 5);

            // Property: Single matching die should score correctly
            expect(calculateScore(category, [targetValue])).toBe(targetValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Lower Section Scoring Accuracy', () => {
    /**
     * **Feature: yahtzee-plugin, Property 8: Lower section scoring accuracy**
     * **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**
     *
     * Property: For any lower section category and dice combination, the calculated 
     * score should match official Yahtzee rules: Three/Four of a Kind sum all dice, 
     * Full House awards 25 points, Small Straight awards 30 points, Large Straight 
     * awards 40 points, Yahtzee awards 50 points, and Chance sums all dice
     *
     * This property ensures that:
     * 1. Three/Four of a Kind scoring sums all dice when condition is met
     * 2. Fixed-point categories award correct points when condition is met
     * 3. Chance always sums all dice regardless of combination
     * 4. Invalid combinations return 0 for conditional categories
     */
    it('should correctly calculate lower section scores according to official rules', async () => {
      await fc.assert(
        fc.property(
          // Generate arbitrary test parameters
          fc.record({
            dice: fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 0, maxLength: 8 }),
          }),
          (testData) => {
            // Test Chance category - should always sum all dice
            const chanceScore = calculateScore(YahtzeeCategory.CHANCE, testData.dice);
            const expectedChanceScore = testData.dice.reduce((sum, die) => sum + die, 0);
            expect(chanceScore).toBe(expectedChanceScore);

            // Test Three of a Kind - should sum all dice if condition met, 0 otherwise
            const threeOfAKindScore = calculateScore(YahtzeeCategory.THREE_OF_A_KIND, testData.dice);
            const hasThreeOfAKind = hasNOfAKind(testData.dice, 3);
            if (hasThreeOfAKind) {
              expect(threeOfAKindScore).toBe(expectedChanceScore);
            } else {
              expect(threeOfAKindScore).toBe(0);
            }

            // Test Four of a Kind - should sum all dice if condition met, 0 otherwise
            const fourOfAKindScore = calculateScore(YahtzeeCategory.FOUR_OF_A_KIND, testData.dice);
            const hasFourOfAKind = hasNOfAKind(testData.dice, 4);
            if (hasFourOfAKind) {
              expect(fourOfAKindScore).toBe(expectedChanceScore);
            } else {
              expect(fourOfAKindScore).toBe(0);
            }

            // Test Yahtzee - should be 50 if all dice match, 0 otherwise
            const yahtzeeScore = calculateScore(YahtzeeCategory.YAHTZEE, testData.dice);
            const hasYahtzee = hasNOfAKind(testData.dice, 5) && testData.dice.length >= 5;
            if (hasYahtzee) {
              expect(yahtzeeScore).toBe(50);
            } else {
              expect(yahtzeeScore).toBe(0);
            }

            // Test Full House - should be 25 if valid full house, 0 otherwise
            const fullHouseScore = calculateScore(YahtzeeCategory.FULL_HOUSE, testData.dice);
            const hasFullHouse = isValidFullHouse(testData.dice);
            if (hasFullHouse) {
              expect(fullHouseScore).toBe(25);
            } else {
              expect(fullHouseScore).toBe(0);
            }

            // Test Small Straight - should be 30 if valid, 0 otherwise
            const smallStraightScore = calculateScore(YahtzeeCategory.SMALL_STRAIGHT, testData.dice);
            const hasSmallStraight = isValidSmallStraight(testData.dice);
            if (hasSmallStraight) {
              expect(smallStraightScore).toBe(30);
            } else {
              expect(smallStraightScore).toBe(0);
            }

            // Test Large Straight - should be 40 if valid, 0 otherwise
            const largeStraightScore = calculateScore(YahtzeeCategory.LARGE_STRAIGHT, testData.dice);
            const hasLargeStraight = isValidLargeStraight(testData.dice);
            if (hasLargeStraight) {
              expect(largeStraightScore).toBe(40);
            } else {
              expect(largeStraightScore).toBe(0);
            }

            // Property: All scores should be non-negative
            [chanceScore, threeOfAKindScore, fourOfAKindScore, yahtzeeScore, 
             fullHouseScore, smallStraightScore, largeStraightScore].forEach(score => {
              expect(score).toBeGreaterThanOrEqual(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Lower section scoring should be consistent with dice order
     * This ensures that dice arrangement doesn't affect scoring
     */
    it('should produce consistent scores regardless of dice order', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            dice: fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 8 }),
          }),
          (testData) => {
            // Create different arrangements of the same dice
            const shuffledDice = [...testData.dice].sort(() => Math.random() - 0.5);
            const reversedDice = [...testData.dice].reverse();

            const lowerSectionCategories = [
              YahtzeeCategory.THREE_OF_A_KIND,
              YahtzeeCategory.FOUR_OF_A_KIND,
              YahtzeeCategory.FULL_HOUSE,
              YahtzeeCategory.SMALL_STRAIGHT,
              YahtzeeCategory.LARGE_STRAIGHT,
              YahtzeeCategory.YAHTZEE,
              YahtzeeCategory.CHANCE
            ];

            lowerSectionCategories.forEach(category => {
              const originalScore = calculateScore(category, testData.dice);
              const shuffledScore = calculateScore(category, shuffledDice);
              const reversedScore = calculateScore(category, reversedDice);

              // Property: Order should not affect score
              expect(originalScore).toBe(shuffledScore);
              expect(originalScore).toBe(reversedScore);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Helper functions for property validation
function getTargetValueForCategory(category: YahtzeeCategory): number {
  switch (category) {
    case YahtzeeCategory.ONES: return 1;
    case YahtzeeCategory.TWOS: return 2;
    case YahtzeeCategory.THREES: return 3;
    case YahtzeeCategory.FOURS: return 4;
    case YahtzeeCategory.FIVES: return 5;
    case YahtzeeCategory.SIXES: return 6;
    default: throw new Error(`Invalid upper section category: ${category}`);
  }
}

function hasNOfAKind(dice: number[], n: number): boolean {
  if (dice.length < n) return false;
  const counts: Record<number, number> = {};
  for (const die of dice) {
    counts[die] = (counts[die] || 0) + 1;
  }
  return Object.values(counts).some(count => count >= n);
}

function isValidFullHouse(dice: number[]): boolean {
  if (dice.length < 5) return false;
  const counts: Record<number, number> = {};
  for (const die of dice) {
    counts[die] = (counts[die] || 0) + 1;
  }
  const countValues = Object.values(counts).sort((a, b) => b - a);
  
  // Full house: exactly 3 of one value and 2 of another
  // OR Yahtzee (5 of a kind) also counts as full house
  return (countValues.length === 2 && countValues[0] === 3 && countValues[1] === 2) ||
         (countValues.length === 1 && countValues[0] === 5);
}

function isValidSmallStraight(dice: number[]): boolean {
  const diceSet = new Set(dice);
  const patterns = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ];
  
  return patterns.some(pattern => 
    pattern.every(num => diceSet.has(num))
  );
}

function isValidLargeStraight(dice: number[]): boolean {
  const diceSet = new Set(dice);
  const patterns = [
    [1, 2, 3, 4, 5],
    [2, 3, 4, 5, 6]
  ];
  
  return patterns.some(pattern => 
    pattern.every(num => diceSet.has(num))
  );
}