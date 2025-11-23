/**
 * Tic-Tac-Toe game metadata functions
 * 
 * This module provides metadata about the game without requiring
 * the full engine to be loaded. Useful for game discovery and
 * displaying game information in menus.
 */

import {
  GAME_TYPE,
  GAME_NAME,
  GAME_DESCRIPTION,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from '../shared/constants';

/**
 * Returns the unique identifier for this game type
 */
export function getGameType(): string {
  return GAME_TYPE;
}

/**
 * Returns the human-readable name of the game
 */
export function getGameName(): string {
  return GAME_NAME;
}

/**
 * Returns the minimum number of players required
 */
export function getMinPlayers(): number {
  return MIN_PLAYERS;
}

/**
 * Returns the maximum number of players allowed
 */
export function getMaxPlayers(): number {
  return MAX_PLAYERS;
}

/**
 * Returns a human-readable description of the game
 */
export function getDescription(): string {
  return GAME_DESCRIPTION;
}
