/**
 * Yahtzee Validation Module
 * 
 * Validates dice roll moves and scoring moves according to game rules.
 * This module will be fully implemented in task 6.
 */

import { GameState, Move } from '@domain/models';
import { ValidationResult } from '@domain/interfaces';

/**
 * Validate a move in the context of the current game state
 * 
 * @param state Current game state
 * @param playerId ID of the player making the move
 * @param move The move to validate
 * @returns Validation result indicating if move is valid
 */
export function validateMove(_state: GameState, _playerId: string, _move: Move): ValidationResult {
  // TODO: Implement in task 6 - Implement move validation logic
  throw new Error('validateMove not yet implemented - will be completed in task 6');
}