/**
 * Tic-Tac-Toe game initialization module
 * Handles creation of initial game state
 */

import { GameState, Player, GameLifecycle, Board, Space } from '@domain/models';
import { GameConfig } from '@domain/interfaces';
import { BOARD_SIZE } from '@games/tic-tac-toe/shared';

/**
 * Creates an empty tic-tac-toe board with the specified size
 * @returns Board with empty spaces arranged in a grid
 */
export function createEmptyBoard(): Board {
  const spaces: Space[] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      spaces.push({
        id: `${row},${col}`,
        position: { x: col, y: row },
        tokens: [],
      });
    }
  }

  return {
    spaces,
    metadata: {},
  };
}

/**
 * Initializes a new tic-tac-toe game with the given players
 * @param players - Array of players participating in the game
 * @param config - Game configuration including optional custom settings
 * @returns Initial game state ready for play
 */
export function initializeGame(players: Player[], config: GameConfig): GameState {
  const gameId = config.customSettings?.gameId || `ttt-${Date.now()}`;
  const board = createEmptyBoard();

  return {
    gameId,
    gameType: 'tic-tac-toe',
    lifecycle: GameLifecycle.ACTIVE,
    players,
    currentPlayerIndex: 0,
    phase: 'main',
    board,
    moveHistory: [],
    metadata: {
      boardSize: BOARD_SIZE,
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
