import { Move } from '../../../src/domain/models';

/**
 * Tic-Tac-Toe specific move parameters
 */
export interface TicTacToeMove extends Move<{ row: number; col: number }> {
  action: 'place';
}

/**
 * Tic-Tac-Toe specific game state metadata
 */
export interface TicTacToeMetadata {
  boardSize: number;
}
