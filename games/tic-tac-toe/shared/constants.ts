/**
 * Tic-Tac-Toe game constants
 */

export const BOARD_SIZE = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;
export const GAME_TYPE = 'tic-tac-toe';
export const GAME_NAME = 'Tic-Tac-Toe';
export const GAME_DESCRIPTION =
  'Classic Tic-Tac-Toe game on a 3x3 grid. Players take turns placing X and O tokens, aiming to get three in a row.';

/**
 * All possible winning patterns on a 3x3 board
 * Each pattern is an array of space IDs that form a winning line
 */
export const WIN_PATTERNS = [
  // Rows
  ['0,0', '0,1', '0,2'],
  ['1,0', '1,1', '1,2'],
  ['2,0', '2,1', '2,2'],
  // Columns
  ['0,0', '1,0', '2,0'],
  ['0,1', '1,1', '2,1'],
  ['0,2', '1,2', '2,2'],
  // Diagonals
  ['0,0', '1,1', '2,2'],
  ['0,2', '1,1', '2,0'],
];
