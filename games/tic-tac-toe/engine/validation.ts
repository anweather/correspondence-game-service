import { GameState, Move } from '../../../src/domain/models';
import { ValidationResult } from '../../../src/domain/interfaces';
import { BOARD_SIZE } from '../shared/constants';

/**
 * Validates if a move is legal in the current game state
 * @param state - Current game state
 * @param playerId - ID of the player making the move
 * @param move - Move to validate
 * @returns ValidationResult indicating if move is valid and reason if not
 */
export function validateMove(
  state: GameState,
  playerId: string,
  move: Move
): ValidationResult {
  const { row, col } = move.parameters as { row: number; col: number };

  // Check if it's the player's turn
  if (!isPlayerTurn(state, playerId)) {
    return {
      valid: false,
      reason: 'Not your turn',
    };
  }

  // Check bounds
  if (!isValidPosition(row, col)) {
    return {
      valid: false,
      reason: 'Position out of bounds',
    };
  }

  // Check if space is empty
  const spaceId = `${row},${col}`;
  const space = state.board.spaces.find((s) => s.id === spaceId);

  if (!space) {
    return {
      valid: false,
      reason: 'Invalid space',
    };
  }

  if (isSpaceOccupied(state, row, col)) {
    return {
      valid: false,
      reason: 'Space is already occupied',
    };
  }

  return { valid: true };
}

/**
 * Checks if a position is within valid board bounds
 * @param row - Row coordinate
 * @param col - Column coordinate
 * @returns true if position is valid, false otherwise
 */
export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Checks if a space at the given position is occupied by a token
 * @param state - Current game state
 * @param row - Row coordinate
 * @param col - Column coordinate
 * @returns true if space is occupied, false otherwise
 */
export function isSpaceOccupied(state: GameState, row: number, col: number): boolean {
  const spaceId = `${row},${col}`;
  const space = state.board.spaces.find((s) => s.id === spaceId);
  return space ? space.tokens.length > 0 : false;
}

/**
 * Checks if it's the specified player's turn
 * @param state - Current game state
 * @param playerId - ID of the player to check
 * @returns true if it's the player's turn, false otherwise
 */
export function isPlayerTurn(state: GameState, playerId: string): boolean {
  const currentPlayer = state.players[state.currentPlayerIndex];
  return playerId === currentPlayer.id;
}
