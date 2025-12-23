import { YahtzeeCategory } from './types';

/**
 * Yahtzee game constants
 */

// Game metadata
export const GAME_TYPE = 'yahtzee';
export const GAME_NAME = 'Yahtzee';
export const GAME_DESCRIPTION = 
  'Classic dice-scoring game where players roll 5 dice to achieve scoring combinations. ' +
  'Fill out a scorecard with 13 categories to maximize your score.';

// Player limits
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 8;

// Dice configuration
export const DICE_COUNT = 5;
export const DICE_SIDES = 6;
export const MAX_ROLLS_PER_TURN = 3;

// Scoring constants
export const UPPER_SECTION_BONUS_THRESHOLD = 63;
export const UPPER_SECTION_BONUS_POINTS = 35;
export const FULL_HOUSE_POINTS = 25;
export const SMALL_STRAIGHT_POINTS = 30;
export const LARGE_STRAIGHT_POINTS = 40;
export const YAHTZEE_POINTS = 50;

// Category groupings
export const UPPER_SECTION_CATEGORIES = [
  YahtzeeCategory.ONES,
  YahtzeeCategory.TWOS,
  YahtzeeCategory.THREES,
  YahtzeeCategory.FOURS,
  YahtzeeCategory.FIVES,
  YahtzeeCategory.SIXES
] as const;

export const LOWER_SECTION_CATEGORIES = [
  YahtzeeCategory.THREE_OF_A_KIND,
  YahtzeeCategory.FOUR_OF_A_KIND,
  YahtzeeCategory.FULL_HOUSE,
  YahtzeeCategory.SMALL_STRAIGHT,
  YahtzeeCategory.LARGE_STRAIGHT,
  YahtzeeCategory.YAHTZEE,
  YahtzeeCategory.CHANCE
] as const;

export const ALL_CATEGORIES = [
  ...UPPER_SECTION_CATEGORIES,
  ...LOWER_SECTION_CATEGORIES
] as const;

// Straight patterns for validation
export const SMALL_STRAIGHT_PATTERNS = [
  [1, 2, 3, 4],
  [2, 3, 4, 5],
  [3, 4, 5, 6]
] as const;

export const LARGE_STRAIGHT_PATTERNS = [
  [1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6]
] as const;

// Category display names for UI
export const CATEGORY_NAMES: Record<YahtzeeCategory, string> = {
  [YahtzeeCategory.ONES]: 'Ones',
  [YahtzeeCategory.TWOS]: 'Twos',
  [YahtzeeCategory.THREES]: 'Threes',
  [YahtzeeCategory.FOURS]: 'Fours',
  [YahtzeeCategory.FIVES]: 'Fives',
  [YahtzeeCategory.SIXES]: 'Sixes',
  [YahtzeeCategory.THREE_OF_A_KIND]: 'Three of a Kind',
  [YahtzeeCategory.FOUR_OF_A_KIND]: 'Four of a Kind',
  [YahtzeeCategory.FULL_HOUSE]: 'Full House',
  [YahtzeeCategory.SMALL_STRAIGHT]: 'Small Straight',
  [YahtzeeCategory.LARGE_STRAIGHT]: 'Large Straight',
  [YahtzeeCategory.YAHTZEE]: 'Yahtzee',
  [YahtzeeCategory.CHANCE]: 'Chance'
};

// Category descriptions for UI
export const CATEGORY_DESCRIPTIONS: Record<YahtzeeCategory, string> = {
  [YahtzeeCategory.ONES]: 'Sum of all dice showing 1',
  [YahtzeeCategory.TWOS]: 'Sum of all dice showing 2',
  [YahtzeeCategory.THREES]: 'Sum of all dice showing 3',
  [YahtzeeCategory.FOURS]: 'Sum of all dice showing 4',
  [YahtzeeCategory.FIVES]: 'Sum of all dice showing 5',
  [YahtzeeCategory.SIXES]: 'Sum of all dice showing 6',
  [YahtzeeCategory.THREE_OF_A_KIND]: 'Sum of all dice (requires 3+ of same value)',
  [YahtzeeCategory.FOUR_OF_A_KIND]: 'Sum of all dice (requires 4+ of same value)',
  [YahtzeeCategory.FULL_HOUSE]: '25 points (requires 3 of one value + 2 of another)',
  [YahtzeeCategory.SMALL_STRAIGHT]: '30 points (requires 4 consecutive numbers)',
  [YahtzeeCategory.LARGE_STRAIGHT]: '40 points (requires 5 consecutive numbers)',
  [YahtzeeCategory.YAHTZEE]: '50 points (requires all 5 dice same value)',
  [YahtzeeCategory.CHANCE]: 'Sum of all dice (no requirements)'
};