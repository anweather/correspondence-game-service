/**
 * Yahtzee Rules Module
 *
 * Handles move application, turn advancement, and game completion detection.
 */

import { GameState, Move } from '@domain/models';
import { DiceEngine } from '@domain/game-utils/DiceEngine';
import {
  YahtzeeMove,
  YahtzeeMetadata,
  YahtzeeCategory,
  Scorecard,
  isYahtzeeMove,
  isRollParameters,
  isScoreParameters,
} from '../shared/types';
import { calculateScore, calculateUpperSectionBonus } from './scoring';
import {
  DICE_COUNT,
  DICE_SIDES,
  MAX_ROLLS_PER_TURN,
  UPPER_SECTION_CATEGORIES,
} from '../shared/constants';

/**
 * Apply a validated move to the game state
 *
 * @param state Current game state
 * @param playerId ID of the player making the move
 * @param move The move to apply
 * @returns New game state after applying the move
 */
export function applyMove(state: GameState, playerId: string, move: Move): GameState {
  if (!isYahtzeeMove(move)) {
    throw new Error('Invalid move type for Yahtzee game');
  }

  // Create a deep copy of the game state
  const newState = JSON.parse(JSON.stringify(state)) as GameState<YahtzeeMetadata>;

  // Restore Map objects that were lost in JSON serialization
  newState.metadata.scorecards = new Map();
  state.metadata.scorecards.forEach((scorecard: Scorecard, key: string) => {
    const newScorecard: Scorecard = {
      ...scorecard,
      categories: new Map(scorecard.categories),
    };
    newState.metadata.scorecards.set(key, newScorecard);
  });

  if (move.action === 'roll') {
    return applyRollMove(newState, playerId, move);
  } else if (move.action === 'score') {
    return applyScoreMove(newState, playerId, move);
  } else {
    throw new Error(`Invalid move action: ${move.action}`);
  }
}

/**
 * Apply a dice roll move to the game state
 */
function applyRollMove(
  state: GameState<YahtzeeMetadata>,
  _playerId: string,
  move: YahtzeeMove
): GameState<YahtzeeMetadata> {
  if (!isRollParameters(move.parameters)) {
    throw new Error('Invalid roll parameters');
  }

  const { keepDice } = move.parameters;
  const metadata = state.metadata;

  // Create dice engine with the game's seed
  const diceEngine = new DiceEngine(metadata.randomSeed);

  // Determine which dice to re-roll
  const newDiceValues = [...metadata.currentDice.values];

  // For first roll of the turn, roll all dice
  if (metadata.rollCount === 0) {
    const allDice = diceEngine.rollDice(DICE_COUNT, DICE_SIDES);
    for (let i = 0; i < DICE_COUNT; i++) {
      newDiceValues[i] = allDice[i];
    }
  } else {
    // Re-roll only the dice that are not kept
    const diceToReroll = keepDice.filter((keep) => !keep).length;
    if (diceToReroll > 0) {
      const newDice = diceEngine.rollDice(diceToReroll, DICE_SIDES);
      let newDiceIndex = 0;

      for (let i = 0; i < DICE_COUNT; i++) {
        if (!keepDice[i]) {
          newDiceValues[i] = newDice[newDiceIndex++];
        }
      }
    }
  }

  // Update dice state
  metadata.currentDice.values = newDiceValues;
  metadata.currentDice.keptDice = [...keepDice];

  // Increment roll count
  metadata.rollCount++;

  // Add to roll history
  metadata.rollHistory.push({
    rollNumber: metadata.rollCount,
    values: [...newDiceValues],
    keptDice: [...keepDice],
    timestamp: new Date(),
  });

  // Transition to scoring phase if max rolls reached
  if (metadata.rollCount >= MAX_ROLLS_PER_TURN) {
    metadata.gamePhase = 'scoring';
  }

  return state;
}

/**
 * Apply a scoring move to the game state
 */
function applyScoreMove(
  state: GameState<YahtzeeMetadata>,
  playerId: string,
  move: YahtzeeMove
): GameState<YahtzeeMetadata> {
  if (!isScoreParameters(move.parameters)) {
    throw new Error('Invalid score parameters');
  }

  const { category } = move.parameters;
  const metadata = state.metadata;

  // Get player's scorecard
  const scorecard = metadata.scorecards.get(playerId);
  if (!scorecard) {
    throw new Error('Scorecard not found for player');
  }

  // Calculate score for the category
  const score = calculateScore(category, metadata.currentDice.values);

  // Update scorecard
  scorecard.categories.set(category, score);

  // Recalculate totals
  updateScorecard(scorecard);

  // Add move to history
  state.moveHistory.push(move);

  // Advance to next player
  advanceToNextPlayer(state);

  // Reset turn state for next player
  resetTurnState(metadata);

  return state;
}

/**
 * Update scorecard totals after scoring
 */
function updateScorecard(scorecard: Scorecard): void {
  let upperSectionTotal = 0;
  let lowerSectionTotal = 0;

  // Calculate upper section total
  UPPER_SECTION_CATEGORIES.forEach((category) => {
    const score = scorecard.categories.get(category);
    if (score !== null && score !== undefined) {
      upperSectionTotal += score;
    }
  });

  // Calculate lower section total
  Object.values(YahtzeeCategory).forEach((category) => {
    if (!(UPPER_SECTION_CATEGORIES as readonly YahtzeeCategory[]).includes(category)) {
      const score = scorecard.categories.get(category);
      if (score !== null && score !== undefined) {
        lowerSectionTotal += score;
      }
    }
  });

  // Update totals
  scorecard.upperSectionTotal = upperSectionTotal;
  scorecard.lowerSectionTotal = lowerSectionTotal;

  // Calculate upper section bonus
  scorecard.upperSectionBonus = calculateUpperSectionBonus(upperSectionTotal);

  // Calculate grand total
  scorecard.grandTotal = upperSectionTotal + lowerSectionTotal + scorecard.upperSectionBonus;
}

/**
 * Advance to the next player
 */
function advanceToNextPlayer(state: GameState): void {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
}

/**
 * Reset turn state for the next player
 */
function resetTurnState(metadata: YahtzeeMetadata): void {
  metadata.rollCount = 0;
  metadata.gamePhase = 'rolling';
  metadata.currentDice.keptDice = [false, false, false, false, false];
  metadata.rollHistory = [];
}

/**
 * Check if the game is over
 *
 * @param state Current game state
 * @returns True if game is complete, false otherwise
 */
export function isGameOver(state: GameState): boolean {
  if (!state || !state.metadata) {
    return false; // Invalid state, game not over
  }

  const metadata = state.metadata as YahtzeeMetadata;

  if (!metadata.scorecards) {
    return false; // No scorecards, game not over
  }

  // Game is over when all players have filled all categories
  for (const scorecard of metadata.scorecards.values()) {
    for (const category of Object.values(YahtzeeCategory)) {
      const score = scorecard.categories.get(category);
      if (score === null || score === undefined) {
        return false; // Found an unfilled category
      }
    }
  }

  return true; // All categories filled for all players
}

/**
 * Determine the winner of a completed game
 *
 * @param state Current game state
 * @returns Player ID of winner, or null if no winner/game not over
 */
export function getWinner(state: GameState): string | null {
  if (!isGameOver(state)) {
    return null; // Game not complete
  }

  const metadata = state.metadata as YahtzeeMetadata;
  let highestScore = -1;
  let winner: string | null = null;
  let tieExists = false;

  // Find the player with the highest score
  for (const [playerId, scorecard] of metadata.scorecards.entries()) {
    if (scorecard.grandTotal > highestScore) {
      highestScore = scorecard.grandTotal;
      winner = playerId;
      tieExists = false;
    } else if (scorecard.grandTotal === highestScore) {
      tieExists = true;
    }
  }

  // Return null if there's a tie
  return tieExists ? null : winner;
}
