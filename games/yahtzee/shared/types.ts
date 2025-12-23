import { Move } from '../../../src/domain/models';

/**
 * Yahtzee-specific move types
 */
export interface YahtzeeMove extends Move<RollParameters | ScoreParameters> {
  action: 'roll' | 'score';
}

/**
 * Parameters for dice roll moves
 */
export interface RollParameters {
  keepDice: boolean[]; // Array indicating which dice to keep (true) or re-roll (false)
}

/**
 * Parameters for scoring moves
 */
export interface ScoreParameters {
  category: YahtzeeCategory;
}

/**
 * Yahtzee scoring categories
 */
export enum YahtzeeCategory {
  // Upper Section
  ONES = 'ones',
  TWOS = 'twos',
  THREES = 'threes',
  FOURS = 'fours',
  FIVES = 'fives',
  SIXES = 'sixes',
  
  // Lower Section
  THREE_OF_A_KIND = 'three_of_a_kind',
  FOUR_OF_A_KIND = 'four_of_a_kind',
  FULL_HOUSE = 'full_house',
  SMALL_STRAIGHT = 'small_straight',
  LARGE_STRAIGHT = 'large_straight',
  YAHTZEE = 'yahtzee',
  CHANCE = 'chance'
}

/**
 * Yahtzee-specific game state metadata
 */
export interface YahtzeeMetadata {
  scorecards: Map<string, Scorecard>;
  currentDice: DiceState;
  rollCount: number;
  gamePhase: 'rolling' | 'scoring';
  rollHistory: DiceRoll[];
  randomSeed: string;
}

/**
 * Player's scorecard tracking all categories and scores
 */
export interface Scorecard {
  playerId: string;
  categories: Map<YahtzeeCategory, number | null>;
  upperSectionTotal: number;
  upperSectionBonus: number;
  lowerSectionTotal: number;
  grandTotal: number;
}

/**
 * Current state of the 5 dice
 */
export interface DiceState {
  values: number[]; // Array of 5 dice values (1-6)
  keptDice: boolean[]; // Array indicating which dice are marked as "keep"
}

/**
 * Record of a dice roll for history tracking
 */
export interface DiceRoll {
  rollNumber: number; // 1, 2, or 3
  values: number[];
  keptDice: boolean[];
  timestamp: Date;
}

/**
 * Type guard to check if a move is a YahtzeeMove
 */
export function isYahtzeeMove(move: any): move is YahtzeeMove {
  if (!move || typeof move !== 'object') return false;
  return 'action' in move && 
         (move.action === 'roll' || move.action === 'score') &&
         'playerId' in move && 'timestamp' in move && 'parameters' in move;
}

/**
 * Type guard to check if parameters are RollParameters
 */
export function isRollParameters(params: any): params is RollParameters {
  if (!params || typeof params !== 'object') return false;
  return 'keepDice' in params &&
         Array.isArray(params.keepDice) && params.keepDice.length === 5;
}

/**
 * Type guard to check if parameters are ScoreParameters
 */
export function isScoreParameters(params: any): params is ScoreParameters {
  if (!params || typeof params !== 'object') return false;
  return 'category' in params &&
         Object.values(YahtzeeCategory).includes(params.category);
}