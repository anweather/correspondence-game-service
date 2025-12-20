import { AIStrategy } from '@domain/interfaces/IAIStrategy';
import { GameState, Move } from '@domain/models';
import { GameEnginePlugin } from '@domain/interfaces';

/**
 * Random AI Strategy - Fallback strategy that selects random valid moves
 *
 * This strategy provides a basic AI implementation that can work with any game type
 * by generating all possible moves and selecting one randomly. It serves as a fallback
 * when game-specific AI strategies are not available.
 */
export class RandomAIStrategy implements AIStrategy {
  public readonly id = 'random';
  public readonly name = 'Random AI';
  public readonly description = 'Selects random valid moves from available options';
  public readonly difficulty = 'easy';

  constructor(private gameEngine: GameEnginePlugin) {}

  /**
   * Generate a random valid move for the AI player
   * @param state Current game state
   * @param aiPlayerId ID of the AI player making the move
   * @returns Promise resolving to a valid move
   * @throws Error if no valid moves are available
   */
  async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
    const availableMoves = this.getAvailableMoves(state, aiPlayerId);

    if (availableMoves.length === 0) {
      throw new Error(`No valid moves available for AI player ${aiPlayerId}`);
    }

    // Select a random move from available options
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  }

  /**
   * Get all available valid moves for the AI player
   * This method generates potential moves and validates them using the game engine
   * @param state Current game state
   * @param aiPlayerId ID of the AI player
   * @returns Array of valid moves
   */
  private getAvailableMoves(state: GameState, aiPlayerId: string): Move[] {
    const availableMoves: Move[] = [];
    const potentialMoves = this.generatePotentialMoves(state, aiPlayerId);

    for (const move of potentialMoves) {
      const validation = this.gameEngine.validateMove(state, aiPlayerId, move);
      if (validation.valid) {
        availableMoves.push(move);
      }
    }

    return availableMoves;
  }

  /**
   * Generate all potential moves based on the game board
   * This is a generic approach that works for position-based games
   * @param state Current game state
   * @param aiPlayerId ID of the AI player
   * @returns Array of potential moves to validate
   */
  private generatePotentialMoves(state: GameState, aiPlayerId: string): Move[] {
    const potentialMoves: Move[] = [];

    // For most board games, moves involve placing tokens on empty spaces
    // Generate moves for all empty spaces on the board
    for (const space of state.board.spaces) {
      if (space.tokens.length === 0) {
        // Extract position coordinates from space ID
        // Assuming space ID format like "row,col" for grid-based games
        const coordinates = this.parseSpaceId(space.id);

        if (coordinates) {
          const move: Move = {
            playerId: aiPlayerId,
            timestamp: new Date(),
            action: 'place', // Generic action for placing a token
            parameters: coordinates,
          };
          potentialMoves.push(move);
        }
      }
    }

    return potentialMoves;
  }

  /**
   * Parse space ID to extract coordinates
   * Supports common formats like "row,col" or "x,y"
   * @param spaceId Space identifier
   * @returns Coordinates object or null if parsing fails
   */
  private parseSpaceId(spaceId: string): Record<string, any> | null {
    try {
      // Handle "row,col" format (common for grid games)
      if (spaceId.includes(',')) {
        const parts = spaceId.split(',');
        if (parts.length === 2) {
          const row = parseInt(parts[0], 10);
          const col = parseInt(parts[1], 10);
          if (!isNaN(row) && !isNaN(col)) {
            return { row, col };
          }
        }
      }

      // Handle numeric IDs (convert to position if needed)
      const numericId = parseInt(spaceId, 10);
      if (!isNaN(numericId)) {
        // For linear board representations, could convert to row/col
        // This is a fallback - specific games should override this logic
        return { position: numericId };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate AI-specific configuration
   * Random strategy has no specific configuration requirements
   * @param config Configuration to validate
   * @returns Always true for random strategy
   */
  validateConfiguration(_config: Record<string, any>): boolean {
    // Random strategy accepts any configuration
    return true;
  }

  /**
   * Get the maximum time this strategy should take to generate a move
   * Random strategy is fast, so use a short timeout
   * @returns 500ms timeout for random move generation
   */
  getTimeLimit(): number {
    return 500; // 500ms should be plenty for random selection
  }
}
