/**
 * Perfect Play AI Strategy for Tic-Tac-Toe
 * 
 * Implements a rule-based perfect play strategy that:
 * 1. Takes immediate wins
 * 2. Blocks opponent wins
 * 3. Takes center if available
 * 4. Takes corners
 * 5. Takes edges as last resort
 */

import { AIStrategy } from '@domain/interfaces/IAIStrategy';
import { GameState, Move } from '@domain/models';
import { WIN_PATTERNS, BOARD_SIZE } from '../shared/constants';
import { isSpaceOccupied } from '../engine/validation';

export class PerfectPlayStrategy implements AIStrategy {
  readonly id = 'perfect-play';
  readonly name = 'Perfect Play';
  readonly description = 'Plays optimally using strategic rules: win immediately, block opponent wins, prioritize center/corners';
  readonly difficulty = 'hard';

  async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
    // Get AI player's token type
    const aiPlayerIndex = state.players.findIndex(p => p.id === aiPlayerId);
    const aiTokenType = aiPlayerIndex === 0 ? 'X' : 'O';
    const opponentTokenType = aiTokenType === 'X' ? 'O' : 'X';

    // Strategy 1: Take immediate win
    const winningMove = this.findWinningMove(state, aiTokenType);
    if (winningMove) {
      return this.createMove(winningMove.row, winningMove.col);
    }

    // Strategy 2: Block opponent win
    const blockingMove = this.findWinningMove(state, opponentTokenType);
    if (blockingMove) {
      return this.createMove(blockingMove.row, blockingMove.col);
    }

    // Strategy 3: Take center if available
    if (!isSpaceOccupied(state, 1, 1)) {
      return this.createMove(1, 1);
    }

    // Strategy 4: Take corners
    const corners = [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 2 }
    ];

    for (const corner of corners) {
      if (!isSpaceOccupied(state, corner.row, corner.col)) {
        return this.createMove(corner.row, corner.col);
      }
    }

    // Strategy 5: Take edges
    const edges = [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 1 }
    ];

    for (const edge of edges) {
      if (!isSpaceOccupied(state, edge.row, edge.col)) {
        return this.createMove(edge.row, edge.col);
      }
    }

    // Fallback: Take any available space (should not happen in normal play)
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (!isSpaceOccupied(state, row, col)) {
          return this.createMove(row, col);
        }
      }
    }

    throw new Error('No valid moves available');
  }

  /**
   * Find a move that would complete a winning pattern for the given token type
   * @param state Current game state
   * @param tokenType Token type to check for winning moves ('X' or 'O')
   * @returns Position that would create a win, or null if none exists
   */
  private findWinningMove(state: GameState, tokenType: string): { row: number; col: number } | null {
    for (const pattern of WIN_PATTERNS) {
      const spaces = pattern.map(id => {
        const space = state.board.spaces.find(s => s.id === id);
        return {
          id,
          hasToken: space && space.tokens.length > 0,
          tokenType: space && space.tokens.length > 0 ? space.tokens[0].type : null
        };
      });

      // Check if pattern has exactly 2 of our tokens and 1 empty space
      const ourTokens = spaces.filter(s => s.tokenType === tokenType).length;
      const emptySpaces = spaces.filter(s => !s.hasToken);

      if (ourTokens === 2 && emptySpaces.length === 1) {
        // Found a winning move
        const emptySpaceId = emptySpaces[0].id;
        const [row, col] = emptySpaceId.split(',').map(Number);
        return { row, col };
      }
    }

    return null;
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
   * @returns 500ms - should be very fast for rule-based strategy
   */
  getTimeLimit(): number {
    return 500; // 500ms should be more than enough for rule-based strategy
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