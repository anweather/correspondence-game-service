import type { ComponentType } from 'react';
import type { GameState, MoveInput } from '../../types/game';

/**
 * Props interface for game-specific move input components
 */
export interface GameMoveInputProps {
  gameState: GameState;
  onMoveChange: (move: MoveInput) => void;
}

/**
 * Registry of game-specific move input components
 * Maps game type to its corresponding move input component
 */
type GameComponentRegistry = {
  [gameType: string]: ComponentType<GameMoveInputProps>;
};

// Lazy load game components
const registry: GameComponentRegistry = {};

/**
 * Register a game-specific move input component
 */
export function registerGameComponent(
  gameType: string,
  component: ComponentType<GameMoveInputProps>
): void {
  registry[gameType] = component;
}

/**
 * Get the move input component for a specific game type
 */
export function getGameComponent(gameType: string): ComponentType<GameMoveInputProps> | null {
  return registry[gameType] || null;
}

/**
 * Check if a game type has a registered component
 */
export function hasGameComponent(gameType: string): boolean {
  return gameType in registry;
}

