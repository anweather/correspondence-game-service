/**
 * Connect Four gravity mechanics module
 * Handles disc placement with gravity simulation
 * Requirements: 3.1, 3.4
 */

import { CellState, PlayerColor } from '../shared/types';
import { ROWS } from '../shared/constants';

/**
 * Finds the lowest empty row in a column
 * Scans from bottom to top to find the first empty cell
 * @param board - Current board state
 * @param column - Column to check (0-6)
 * @returns Row index of lowest empty cell, or null if column is full
 * Requirements: 3.1, 3.3
 */
export function findLowestEmptyRow(
  board: CellState[][],
  column: number
): number | null {
  // Scan from bottom (row 5) to top (row 0)
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][column] === null) {
      return row;
    }
  }
  // Column is full
  return null;
}

/**
 * Applies gravity to place a disc in a column
 * Creates a new board with the disc placed at the lowest available position
 * @param board - Current board state
 * @param column - Column to drop disc into (0-6)
 * @param color - Color of the disc to place
 * @returns Object containing new board state and row where disc was placed
 * Requirements: 3.1, 3.4
 */
export function applyGravity(
  board: CellState[][],
  column: number,
  color: PlayerColor
): { board: CellState[][]; row: number } {
  // Find the lowest empty row (efficient bottom-to-top scan)
  const targetRow = findLowestEmptyRow(board, column);

  if (targetRow === null) {
    throw new Error(`Column ${column} is full`);
  }

  // Create new board with disc placed (immutable update)
  // Optimize by only copying rows, then updating the specific cell
  const newBoard = board.map((row, rowIndex) => {
    if (rowIndex === targetRow) {
      // Only create new array for the row that changes
      const newRow = [...row];
      newRow[column] = color;
      return newRow;
    }
    // Reuse unchanged rows
    return row;
  });

  return {
    board: newBoard,
    row: targetRow,
  };
}
