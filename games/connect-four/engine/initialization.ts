/**
 * Connect Four game initialization module
 * Handles game state initialization, board creation, and player color assignment
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import {
  GameState,
  Player,
  GameLifecycle,
  Board,
} from '../../../src/domain/models';
import {
  CellState,
  PlayerColor,
  ConnectFourMetadata,
} from '../shared/types';
import {
  ROWS,
  COLUMNS,
  PLAYER_COLORS,
  GAME_TYPE,
  MIN_PLAYERS,
} from '../shared/constants';

/**
 * Creates an empty Connect Four board
 * @returns A 6x7 board with all cells initialized to null
 * Requirements: 1.1
 */
export function createEmptyBoard(): CellState[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLUMNS }, () => null as CellState)
  );
}

/**
 * Assigns colors to players deterministically
 * First player gets red, second player gets yellow
 * @param players - Array of players (must have exactly 2 players)
 * @returns Map of player ID to assigned color
 * Requirements: 1.2
 */
export function assignPlayerColors(players: Player[]): Map<string, PlayerColor> {
  const colorMap = new Map<string, PlayerColor>();

  players.forEach((player, index) => {
    if (index < PLAYER_COLORS.length) {
      colorMap.set(player.id, PLAYER_COLORS[index]);
    }
  });

  return colorMap;
}

/**
 * Initializes a new Connect Four game
 * @param gameId - Unique identifier for the game
 * @param players - Array of players (must have exactly 2 players)
 * @returns Initialized game state
 * @throws Error if fewer than 2 players provided
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function initializeGame(
  gameId: string,
  players: Player[]
): GameState<ConnectFourMetadata> {
  // Validate player count
  if (players.length < MIN_PLAYERS) {
    throw new Error(
      `Connect Four requires at least ${MIN_PLAYERS} players, but ${players.length} provided`
    );
  }

  // Create empty board
  const board = createEmptyBoard();

  // Create metadata
  const metadata: ConnectFourMetadata = {
    board,
  };

  // Create empty board structure for domain model
  const domainBoard: Board = {
    spaces: [],
    metadata: {},
  };

  const now = new Date();

  // Create initial game state
  const gameState: GameState<ConnectFourMetadata> = {
    gameId,
    gameType: GAME_TYPE,
    lifecycle: GameLifecycle.ACTIVE, // Requirement 1.4: Games start in progress
    players,
    currentPlayerIndex: 0, // Requirement 1.3: First player starts
    phase: 'playing',
    board: domainBoard,
    moveHistory: [],
    metadata,
    version: 0,
    createdAt: now,
    updatedAt: now,
  };

  return gameState;
}
