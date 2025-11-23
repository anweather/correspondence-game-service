/**
 * UI-specific types for Connect Four
 * These types match the web-client's game types for UI component props
 */

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Token {
  id: string;
  type: string;
  ownerId?: string;
  metadata?: Record<string, any>;
}

export interface Space {
  id: string;
  position: Position;
  tokens: Token[];
  metadata?: Record<string, any>;
}

export interface Board {
  spaces: Space[];
  metadata: Record<string, any>;
}

export interface Player {
  id: string;
  externalId?: string;
  name: string;
  joinedAt: string;
  metadata?: Record<string, any>;
}

export interface Move<TParameters = Record<string, any>> {
  playerId: string;
  timestamp: string;
  action: string;
  parameters: TParameters;
}

export interface MoveInput<TParameters = Record<string, any>> {
  action: string;
  parameters: TParameters;
}

export type GameLifecycle = 'created' | 'waiting_for_players' | 'active' | 'completed' | 'abandoned';

export interface GameState<TMetadata = Record<string, any>> {
  gameId: string;
  gameType: string;
  lifecycle: GameLifecycle;
  players: Player[];
  currentPlayerIndex: number;
  phase: string;
  board: Board;
  moveHistory: Move[];
  metadata: TMetadata;
  version: number;
  createdAt: string;
  updatedAt: string;
}
