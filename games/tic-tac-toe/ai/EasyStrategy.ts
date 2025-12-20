/**
 * Easy AI Strategy for Tic-Tac-Toe
 * 
 * Implements a simple random move selection strategy that provides
 * an easy opponent for beginners. Selects randomly from all valid moves.
 */

import { AIStrategy } from '@domain/interfaces/IAIStrategy';
import { GameState, Move } from '@domain/models';
import { BOARD_SIZE } from '../shared/constants';
import { isSpaceOccupied } from '../engine/validation';

export class EasyStrategy implements AIStrategy {
  readonly id = 'easy';
  readonly name = 'Easy';
  readonly description = 'Makes random valid moves - perfect for beginners';
  readonly difficulty = 'easy';

  async generateMove(state: GameState, _aiPlayerId: string): Promise<Move> {
    // Get all available moves
    const availableMoves: { row: number; col: number }[] = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (!isSpaceOccupied(state, row, col)) {
          availableMoves.push({ row, col });
        }
      }
    }

    if (availableMoves.length === 0) {
      throw new Error('No valid moves available');
    }

    // Select a random move
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    const selectedMove = availableMoves[randomIndex];

    return this.createMove(selectedMove.row, selectedMove.col);
  }

  /**
   * Create a move object for the given position
   * @param row Row coordinate
   * @param col Column coordinate
   * @returns Move object
   */
  private createMove(row: number, col: number): Move {
    return {
      playerId: '', // Will be set by the calling service
      action: 'place',
      parameters: { row, col },
      timestamp: new Date()
    };
  }

  /**
   * Get the maximum time this strategy should take to generate a move
   * @returns 100ms - should be very fast for random selection
   */
  getTimeLimit(): number {
    return 100; // 100ms should be more than enough for random selection
  }

  /**
   * Validate configuration (no special configuration needed for this strategy)
   * @param config Configuration to validate
   * @returns Always true as no configuration is required
   */
  validateConfiguration(_config: Record<string, any>): boolean {
    return true; // No configuration required
  }
}