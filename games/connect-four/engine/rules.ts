/**
 * Connect Four rules module
 * Handles win detection logic for all four directions
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { GameState, GameLifecycle } from '../../../src/domain/models';
import { CellState, PlayerColor, Direction, ConnectFourMetadata, ConnectFourMove } from '../shared/types';
import { ROWS, COLUMNS, WIN_LENGTH, DIRECTIONS } from '../shared/constants';
import { validateMove } from './validation';
import { applyGravity } from './gravity';
import { assignPlayerColors } from './initialization';

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

/**
 * Applies a move to the game state, creating a new immutable state
 * Integrates gravity, win detection, and turn switching
 * @param state - Current game state
 * @param move - Move to apply
 * @returns New game state with move applied
 * @throws Error if move is invalid
 * Requirements: 6.1, 6.2, 9.1, 9.3
 */
export function applyMove(
  state: GameState<ConnectFourMetadata>,
  move: ConnectFourMove
): GameState<ConnectFourMetadata> {
  // Dependencies imported at top of file

  // Requirement 9.3: Validate move before applying
  const validation = validateMove(state, move.playerId, move);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid move');
  }

  // Requirement 6.2: Don't allow moves on completed games
  if (state.lifecycle === GameLifecycle.COMPLETED) {
    throw new Error('Game is already completed');
  }

  // Get player color
  const playerColors = assignPlayerColors(state.players);
  const playerColor = playerColors.get(move.playerId);
  if (!playerColor) {
    throw new Error(`Player ${move.playerId} not found in game`);
  }

  // Requirement 3.1: Apply gravity to place disc
  const { board: newBoard, row } = applyGravity(
    state.metadata.board,
    move.parameters.column,
    playerColor
  );

  // Check for win from the newly placed disc position
  const hasWin = checkWinFromPosition(newBoard, row, move.parameters.column, playerColor);

  // Determine new lifecycle based on win or draw
  const newLifecycle: GameLifecycle = 
    hasWin || isBoardFull(newBoard) 
      ? GameLifecycle.COMPLETED 
      : state.lifecycle;

  // Requirement 6.1: Alternate turns (only if game is not completed)
  const newPlayerIndex = 
    newLifecycle === GameLifecycle.COMPLETED
      ? state.currentPlayerIndex
      : (state.currentPlayerIndex + 1) % state.players.length;

  // Requirement 9.1: Create new immutable state
  return {
    ...state,
    lifecycle: newLifecycle,
    currentPlayerIndex: newPlayerIndex,
    metadata: {
      ...state.metadata,
      board: newBoard,
      lastMove: {
        row,
        column: move.parameters.column,
        player: move.playerId,
      },
    },
    moveHistory: [...state.moveHistory, move],
    version: state.version + 1,
    updatedAt: new Date(),
  };
}
