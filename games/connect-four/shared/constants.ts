import { Direction, PlayerColor } from './types';

/**
 * Connect Four game constants
 */

// Board dimensions
export const ROWS = 6;
export const COLUMNS = 7;
export const TOTAL_CELLS = 42;
export const WIN_LENGTH = 4;

// Player configuration
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;
export const PLAYER_COLORS: PlayerColor[] = ['red', 'yellow'];

// Game identification
export const GAME_TYPE = 'connect-four';
export const GAME_NAME = 'Connect Four';
export const GAME_DESCRIPTION =
  'Classic Connect Four game on a 7x6 vertical grid. Players take turns dropping colored discs, aiming to connect four in a row horizontally, vertically, or diagonally.';

// Win pattern directions
export const DIRECTIONS: Record<string, Direction> = {
  HORIZONTAL: { row: 0, col: 1 },
  VERTICAL: { row: 1, col: 0 },
  DIAGONAL_UP: { row: -1, col: 1 },
  DIAGONAL_DOWN: { row: 1, col: 1 },
};
