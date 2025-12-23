/**
 * Yahtzee Scoring Module
 * 
 * Calculates scores for all 13 Yahtzee categories according to official rules.
 */

import { YahtzeeCategory } from '../shared/types';
import { 
  UPPER_SECTION_BONUS_THRESHOLD, 
  UPPER_SECTION_BONUS_POINTS,
  FULL_HOUSE_POINTS,
  SMALL_STRAIGHT_POINTS,
  LARGE_STRAIGHT_POINTS,
  YAHTZEE_POINTS
} from '../shared/constants';

/**
 * Calculate the score for a given category and dice combination
 * 
 * @param category The scoring category to calculate
 * @param dice Array of 5 dice values (1-6)
 * @returns The score for this category, or 0 if combination doesn't qualify
 */
export function calculateScore(category: YahtzeeCategory, dice: number[]): number {
  if (!dice || dice.length === 0) {
    return 0;
  }

  switch (category) {
    // Upper Section - sum matching dice
    case YahtzeeCategory.ONES:
      return sumMatchingDice(dice, 1);
    case YahtzeeCategory.TWOS:
      return sumMatchingDice(dice, 2);
    case YahtzeeCategory.THREES:
      return sumMatchingDice(dice, 3);
    case YahtzeeCategory.FOURS:
      return sumMatchingDice(dice, 4);
    case YahtzeeCategory.FIVES:
      return sumMatchingDice(dice, 5);
    case YahtzeeCategory.SIXES:
      return sumMatchingDice(dice, 6);

    // Lower Section - special combinations
    case YahtzeeCategory.THREE_OF_A_KIND:
      return hasNOfAKind(dice, 3) ? sumAllDice(dice) : 0;
    case YahtzeeCategory.FOUR_OF_A_KIND:
      return hasNOfAKind(dice, 4) ? sumAllDice(dice) : 0;
    case YahtzeeCategory.FULL_HOUSE:
      return isFullHouse(dice) ? FULL_HOUSE_POINTS : 0;
    case YahtzeeCategory.SMALL_STRAIGHT:
      return isSmallStraight(dice) ? SMALL_STRAIGHT_POINTS : 0;
    case YahtzeeCategory.LARGE_STRAIGHT:
      return isLargeStraight(dice) ? LARGE_STRAIGHT_POINTS : 0;
    case YahtzeeCategory.YAHTZEE:
      return hasNOfAKind(dice, 5) ? YAHTZEE_POINTS : 0;
    case YahtzeeCategory.CHANCE:
      return sumAllDice(dice);

    default:
      return 0;
  }
}

/**
 * Calculate upper section bonus eligibility
 * 
 * @param upperSectionTotal Current total of upper section categories
 * @returns Bonus points (35 if eligible, 0 otherwise)
 */
export function calculateUpperSectionBonus(upperSectionTotal: number): number {
  return upperSectionTotal >= UPPER_SECTION_BONUS_THRESHOLD ? UPPER_SECTION_BONUS_POINTS : 0;
}

/**
 * Helper function to sum all dice showing a specific value
 */
function sumMatchingDice(dice: number[], targetValue: number): number {
  return dice.filter(die => die === targetValue).reduce((sum, die) => sum + die, 0);
}

/**
 * Helper function to sum all dice values
 */
function sumAllDice(dice: number[]): number {
  return dice.reduce((sum, die) => sum + die, 0);
}

/**
 * Helper function to check if dice contain N or more of the same value
 */
function hasNOfAKind(dice: number[], n: number): boolean {
  const counts = getDiceCounts(dice);
  return Object.values(counts).some(count => count >= n);
}

/**
 * Helper function to check if dice form a full house (3 of one + 2 of another, or 5 of a kind)
 */
function isFullHouse(dice: number[]): boolean {
  const counts = getDiceCounts(dice);
  const countValues = Object.values(counts).sort((a, b) => b - a);
  
  // Full house: exactly 3 of one value and 2 of another
  // OR Yahtzee (5 of a kind) also counts as full house
  return (countValues.length === 2 && countValues[0] === 3 && countValues[1] === 2) ||
         (countValues.length === 1 && countValues[0] === 5);
}

/**
 * Helper function to check if dice contain a small straight (4 consecutive numbers)
 */
function isSmallStraight(dice: number[]): boolean {
  const diceSet = new Set(dice);
  
  // Check each of the three possible small straight patterns
  const patterns = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ];
  
  return patterns.some(pattern => 
    pattern.every(num => diceSet.has(num))
  );
}

/**
 * Helper function to check if dice contain a large straight (5 consecutive numbers)
 */
function isLargeStraight(dice: number[]): boolean {
  const diceSet = new Set(dice);
  
  // Check each of the two possible large straight patterns
  const patterns = [
    [1, 2, 3, 4, 5],
    [2, 3, 4, 5, 6]
  ];
  
  return patterns.some(pattern => 
    pattern.every(num => diceSet.has(num))
  );
}

/**
 * Helper function to count occurrences of each die value
 */
function getDiceCounts(dice: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const die of dice) {
    counts[die] = (counts[die] || 0) + 1;
  }
  return counts;
}