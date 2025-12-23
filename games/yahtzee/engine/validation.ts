/**
 * Yahtzee Validation Module
 * 
 * Validates dice roll moves and scoring moves according to game rules.
 * Requirements: 2.2, 2.4, 3.4, 6.2
 */

import { GameState, Move } from '@domain/models';
import { ValidationResult } from '@domain/interfaces';
import { 
  YahtzeeMove, 
  YahtzeeMetadata, 
  YahtzeeCategory,
  isYahtzeeMove,
  isRollParameters,
  isScoreParameters
} from '../shared/types';
import { MAX_ROLLS_PER_TURN } from '../shared/constants';

/**
 * Validate a move in the context of the current game state
 * 
 * @param state Current game state
 * @param playerId ID of the player making the move
 * @param move The move to validate
 * @returns Validation result indicating if move is valid
 */
export function validateMove(
  state: GameState<YahtzeeMetadata>, 
  playerId: string, 
  move: Move
): ValidationResult {
  // Basic move structure validation
  if (!move || !move.parameters) {
    return {
      valid: false,
      reason: 'Move is missing parameters'
    };
  }

  // Type guard to ensure this is a Yahtzee move
  if (!isYahtzeeMove(move)) {
    return {
      valid: false,
      reason: 'Move has invalid action - must be "roll" or "score"'
    };
  }

  const yahtzeeMove = move as YahtzeeMove;

  // Validate turn order
  const turnValidation = validateTurnOrder(state, playerId);
  if (!turnValidation.valid) {
    return turnValidation;
  }

  // Validate based on move action
  switch (yahtzeeMove.action) {
    case 'roll':
      return validateRollMove(state, playerId, yahtzeeMove);
    case 'score':
      return validateScoreMove(state, playerId, yahtzeeMove);
    default:
      return {
        valid: false,
        reason: `Invalid action: ${yahtzeeMove.action}`
      };
  }
}

/**
 * Validates that it's the specified player's turn
 */
function validateTurnOrder(state: GameState<YahtzeeMetadata>, playerId: string): ValidationResult {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return {
      valid: false,
      reason: 'It is not your turn'
    };
  }
  return { valid: true };
}

/**
 * Validates a dice roll move
 */
function validateRollMove(
  state: GameState<YahtzeeMetadata>, 
  _playerId: string, 
  move: YahtzeeMove
): ValidationResult {
  // Check if game is in rolling phase
  if (state.metadata.gamePhase !== 'rolling') {
    return {
      valid: false,
      reason: 'Cannot roll dice during scoring phase'
    };
  }

  // Check if player has exceeded maximum rolls
  if (state.metadata.rollCount >= MAX_ROLLS_PER_TURN) {
    return {
      valid: false,
      reason: `Cannot exceed maximum rolls per turn (${MAX_ROLLS_PER_TURN})`
    };
  }

  // Validate roll parameters
  if (!isRollParameters(move.parameters)) {
    // Check specific case of wrong array length first
    if (move.parameters && 'keepDice' in move.parameters && Array.isArray(move.parameters.keepDice)) {
      if (move.parameters.keepDice.length !== 5) {
        return {
          valid: false,
          reason: 'keepDice array must have exactly 5 elements'
        };
      }
    }
    return {
      valid: false,
      reason: 'Invalid roll parameters'
    };
  }

  const { keepDice } = move.parameters;

  // Validate keepDice array length
  if (keepDice.length !== 5) {
    return {
      valid: false,
      reason: 'keepDice array must have exactly 5 elements'
    };
  }

  // Validate keepDice array contains only booleans
  if (!keepDice.every(keep => typeof keep === 'boolean')) {
    return {
      valid: false,
      reason: 'keepDice array must contain only boolean values'
    };
  }

  return { valid: true };
}

/**
 * Validates a scoring move
 */
function validateScoreMove(
  state: GameState<YahtzeeMetadata>, 
  playerId: string, 
  move: YahtzeeMove
): ValidationResult {
  // Check if game is in scoring phase
  if (state.metadata.gamePhase !== 'scoring') {
    return {
      valid: false,
      reason: 'Cannot score during rolling phase - must complete dice rolls first'
    };
  }

  // Validate score parameters
  if (!isScoreParameters(move.parameters)) {
    // Check for invalid category specifically
    if (move.parameters && 'category' in move.parameters) {
      if (!Object.values(YahtzeeCategory).includes(move.parameters.category as YahtzeeCategory)) {
        return {
          valid: false,
          reason: `Invalid category: ${move.parameters.category}`
        };
      }
    }
    return {
      valid: false,
      reason: 'Invalid score parameters'
    };
  }

  const { category } = move.parameters;

  // Validate category is a valid Yahtzee category
  if (!Object.values(YahtzeeCategory).includes(category)) {
    return {
      valid: false,
      reason: `Invalid category: ${category}`
    };
  }

  // Get player's scorecard
  const scorecard = state.metadata.scorecards.get(playerId);
  if (!scorecard) {
    return {
      valid: false,
      reason: 'Player scorecard not found'
    };
  }

  // Check if category is already used
  const categoryScore = scorecard.categories.get(category);
  if (categoryScore !== null && categoryScore !== undefined) {
    return {
      valid: false,
      reason: `Category ${category} has already been used`
    };
  }

  return { valid: true };
}