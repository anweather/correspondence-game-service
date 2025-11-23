/**
 * Connect Four move validation module
 * Handles validation of player moves including turn validation, column validation
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { GameState } from '../../../src/domain/models';
import { ConnectFourMetadata, ConnectFourMove, CellState } from '../shared/types';
import { COLUMNS } from '../shared/constants';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Error message constants for validation failures
 * Requirement 2.4: Descriptive error messages
 */
const ERROR_MESSAGES = {
  NOT_YOUR_TURN: 'It is not your turn',
  INVALID_COLUMN: (column: number) => `Column must be between 0 and 6, but got ${column}`,
  COLUMN_FULL: (column: number) => `Column ${column} is full`,
} as const;

/**
 * Checks if a column number is valid (0-6)
 * @param column - Column number to validate
 * @returns true if column is between 0 and 6 inclusive
 * Requirements: 2.2
 */
export function isValidColumn(column: number): boolean {
  return column >= 0 && column < COLUMNS;
}

/**
 * Checks if a column is completely filled
 * @param board - Current board state
 * @param column - Column to check
 * @returns true if the column has no empty cells
 * Requirements: 2.3
 */
export function isColumnFull(board: CellState[][], column: number): boolean {
  // Check if the top row (row 0) of the column is occupied
  // If the top is occupied, the entire column must be full due to gravity
  return board[0][column] !== null;
}

/**
 * Checks if it is the specified player's turn
 * @param state - Current game state
 * @param playerId - Player ID to check
 * @returns true if it is the player's turn
 * Requirements: 2.1
 */
export function isPlayerTurn(
  state: GameState<ConnectFourMetadata>,
  playerId: string
): boolean {
  const currentPlayer = state.players[state.currentPlayerIndex];
  return currentPlayer.id === playerId;
}

/**
 * Validates a Connect Four move
 * Checks turn order, column validity, and column availability
 * @param state - Current game state
 * @param playerId - ID of player making the move
 * @param move - Move to validate
 * @returns Validation result with error message if invalid
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function validateMove(
  state: GameState<ConnectFourMetadata>,
  playerId: string,
  move: ConnectFourMove
): ValidationResult {
  // Requirement 2.1: Verify it is the player's turn
  if (!isPlayerTurn(state, playerId)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.NOT_YOUR_TURN,
    };
  }

  const { column } = move.parameters;

  // Requirement 2.2: Verify column is valid (0-6)
  if (!isValidColumn(column)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_COLUMN(column),
    };
  }

  // Requirement 2.3: Verify column is not full
  if (isColumnFull(state.metadata.board, column)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.COLUMN_FULL(column),
    };
  }

  // Requirement 2.5: Valid move passes all checks
  return {
    valid: true,
  };
}
