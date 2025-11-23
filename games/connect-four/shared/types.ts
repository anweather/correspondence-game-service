import { Move } from '../../../src/domain/models';

/**
 * Connect Four specific move parameters
 */
export interface ConnectFourMove extends Move<{ column: number }> {
  action: 'drop';
}

/**
 * Cell state in the Connect Four board
 */
export type CellState = null | 'red' | 'yellow';

/**
 * Player color assignment
 */
export type PlayerColor = 'red' | 'yellow';

/**
 * Connect Four specific game state metadata
 */
export interface ConnectFourMetadata {
  board: CellState[][];  // 6 rows × 7 columns
  lastMove?: {
    row: number;
    column: number;
    player: string;
  };
}

/**
 * Position on the board
 */
export interface Position {
  row: number;
  column: number;
}

/**
 * Direction vector for win detection
 */
export interface Direction {
  row: number;
  col: number;
}
