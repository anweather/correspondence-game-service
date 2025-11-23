/**
 * Connect Four rules module
 * Handles win detection logic for all four directions
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { CellState, PlayerColor, Direction } from '../shared/types';
import { ROWS, COLUMNS, WIN_LENGTH, DIRECTIONS } from '../shared/constants';

/**
 * Checks if a position is within board bounds
 * @param row - Row position
 * @param col - Column position
 * @returns true if position is within bounds
 */
function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLUMNS;
}

/**
 * Checks if there are WIN_LENGTH consecutive discs in a specific direction
 * @param board - Current board state
 * @param row - Starting row position
 * @param col - Starting column position
 * @param color - Player color to check for
 * @param direction - Direction vector to check (row and col deltas)
 * @returns true if WIN_LENGTH consecutive discs found in the direction
 */
export function checkDirection(
  board: CellState[][],
  row: number,
  col: number,
  color: PlayerColor,
  direction: Direction
): boolean {
  let count = 1; // Start with 1 to count the starting position

  // Check backwards (negative direction)
  let r = row - direction.row;
  let c = col - direction.col;
  while (isInBounds(r, c) && board[r][c] === color) {
    count++;
    if (count >= WIN_LENGTH) return true; // Early exit optimization
    r -= direction.row;
    c -= direction.col;
  }

  // Check forwards (positive direction)
  r = row + direction.row;
  c = col + direction.col;
  while (isInBounds(r, c) && board[r][c] === color) {
    count++;
    if (count >= WIN_LENGTH) return true; // Early exit optimization
    r += direction.row;
    c += direction.col;
  }

  return count >= WIN_LENGTH;
}

/**
 * Checks if there is a winning pattern from a specific position
 * Checks all four directions: horizontal, vertical, and both diagonals
 * @param board - Current board state
 * @param row - Row position to check from
 * @param col - Column position to check from
 * @param color - Player color to check for
 * @returns true if a winning pattern is found in any direction
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function checkWinFromPosition(
  board: CellState[][],
  row: number,
  col: number,
  color: PlayerColor
): boolean {
  // If the position doesn't contain the specified color, no win is possible
  if (board[row][col] !== color) {
    return false;
  }

  // Check all four directions
  // Requirement 4.1: Horizontal wins
  if (checkDirection(board, row, col, color, DIRECTIONS.HORIZONTAL)) {
    return true;
  }

  // Requirement 4.2: Vertical wins
  if (checkDirection(board, row, col, color, DIRECTIONS.VERTICAL)) {
    return true;
  }

  // Requirement 4.3: Ascending diagonal wins (bottom-left to top-right)
  if (checkDirection(board, row, col, color, DIRECTIONS.DIAGONAL_UP)) {
    return true;
  }

  // Requirement 4.4: Descending diagonal wins (top-left to bottom-right)
  if (checkDirection(board, row, col, color, DIRECTIONS.DIAGONAL_DOWN)) {
    return true;
  }

  return false;
}

/**
 * Checks if the board is completely full (all cells occupied)
 * @param board - Current board state
 * @returns true if all cells are filled
 * Requirements: 5.1, 5.2
 */
export function isBoardFull(board: CellState[][]): boolean {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      if (board[row][col] === null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Determines the winner of the game by checking all positions
 * @param board - Current board state
 * @returns The winning player color, or null if no winner
 * Requirements: 4.5
 */
export function getWinner(board: CellState[][]): PlayerColor | null {
  // Check every position on the board for a winning pattern
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const color = board[row][col];
      if (color && checkWinFromPosition(board, row, col, color)) {
        return color;
      }
    }
  }
  return null;
}

/**
 * Checks if the game is over (either won or drawn)
 * @param board - Current board state
 * @returns true if the game is complete (has a winner or board is full)
 * Requirements: 4.5, 5.1, 5.2
 */
export function isGameOver(board: CellState[][]): boolean {
  // Game is over if there's a winner or the board is full
  return getWinner(board) !== null || isBoardFull(board);
}
