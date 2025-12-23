/**
 * Yahtzee Metadata Module
 * 
 * Provides game type identification, player limits, and game description.
 * This module will be fully implemented in task 3.
 */

import { GAME_TYPE, GAME_DESCRIPTION, MIN_PLAYERS, MAX_PLAYERS } from '../shared/constants';

/**
 * Get the game type identifier
 */
export function getGameType(): string {
  return GAME_TYPE;
}

/**
 * Get minimum number of players
 */
export function getMinPlayers(): number {
  return MIN_PLAYERS;
}

/**
 * Get maximum number of players
 */
export function getMaxPlayers(): number {
  return MAX_PLAYERS;
}

/**
 * Get game description
 */
export function getDescription(): string {
  return GAME_DESCRIPTION;
}