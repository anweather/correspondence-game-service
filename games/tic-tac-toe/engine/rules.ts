/**
 * Tic-Tac-Toe game rules and state transitions
 * 
 * This module contains the core game logic for applying moves,
 * checking game completion, and determining winners.
 */

import { GameState, Move, Token } from '@domain/models';
import { WIN_PATTERNS } from '../shared/constants';

/**
 * Apply a move to the game state, creating a new state with the move applied.
 * This function maintains immutability by creating a new state object.
 * 
 * @param state - Current game state
 * @param playerId - ID of the player making the move
 * @param move - Move to apply
 * @returns New game state with the move applied
 */
export function applyMove(state: GameState, playerId: string, move: Move): GameState {
  const { row, col } = move.parameters as { row: number; col: number };
  const spaceId = `${row},${col}`;

  // Determine token type based on player index
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  const tokenType = playerIndex === 0 ? 'X' : 'O';

  // Create new token
  const token: Token = {
    id: `token-${Date.now()}`,
    type: tokenType,
    ownerId: playerId,
  };

  // Create new board with token placed (immutable update)
  const newSpaces = state.board.spaces.map((space) => {
    if (space.id === spaceId) {
      return {
        ...space,
        tokens: [...space.tokens, token],
      };
    }
    return space;
  });

  // Return new state with updated board and move history
  return {
    ...state,
    board: {
      ...state.board,
      spaces: newSpaces,
    },
    moveHistory: [...state.moveHistory, move],
    version: state.version + 1,
    updatedAt: new Date(),
  };
}

/**
 * Check if the game is over (either won or drawn).
 * 
 * @param state - Current game state
 * @returns True if the game is over, false otherwise
 */
export function isGameOver(state: GameState): boolean {
  // Check if there's a winner
  if (getWinner(state) !== null) {
    return true;
  }

  // Check if board is full (draw)
  return isBoardFull(state);
}

/**
 * Get the winner of the game, if any.
 * 
 * @param state - Current game state
 * @returns Player ID of the winner, or null if no winner yet
 */
export function getWinner(state: GameState): string | null {
  // Check all possible winning combinations
  for (const pattern of WIN_PATTERNS) {
    const winner = checkWinPattern(state, pattern);
    if (winner !== null) {
      return winner;
    }
  }

  return null;
}

/**
 * Check if a specific pattern represents a win for any player.
 * 
 * @param state - Current game state
 * @param pattern - Array of space IDs to check
 * @returns Player ID if the pattern is a win, null otherwise
 */
export function checkWinPattern(state: GameState, pattern: string[]): string | null {
  const spaces = pattern.map((id) => state.board.spaces.find((s) => s.id === id));

  // Check if all spaces in pattern have tokens
  if (spaces.every((s) => s && s.tokens.length > 0)) {
    const tokens = spaces.map((s) => s!.tokens[0]);

    // Check if all tokens are the same type and have the same owner
    const firstToken = tokens[0];
    if (tokens.every((t) => t.type === firstToken.type && t.ownerId === firstToken.ownerId)) {
      return firstToken.ownerId!;
    }
  }

  return null;
}

/**
 * Check if the board is completely filled with tokens.
 * 
 * @param state - Current game state
 * @returns True if all spaces have tokens, false otherwise
 */
export function isBoardFull(state: GameState): boolean {
  return state.board.spaces.every((space) => space.tokens.length > 0);
}
