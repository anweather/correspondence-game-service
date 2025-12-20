/**
 * Tic-Tac-Toe AI Strategies
 * 
 * This module exports all AI strategies available for Tic-Tac-Toe games.
 * Each strategy implements the AIStrategy interface and provides different
 * levels of gameplay difficulty and behavior.
 */

export { PerfectPlayStrategy } from './PerfectPlayStrategy';
export { EasyStrategy } from './EasyStrategy';

// Re-export types for convenience
export type { AIStrategy } from '@domain/interfaces/IAIStrategy';