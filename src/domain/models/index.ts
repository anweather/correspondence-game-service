// Export PlayerProfile
export * from './PlayerProfile';

// Export GameInvitation
export * from './GameInvitation';

/**
 * Game lifecycle states
 */
export enum GameLifecycle {
  CREATED = 'created',
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

/**
 * Position on a board (2D or 3D)
 */
export interface Position {
  x: number;
  y: number;
  z?: number;
}

/**
 * Token (game piece) on the board
 */
export interface Token {
  id: string;
  type: string;
  ownerId?: string;
  metadata?: Record<string, any>;
}

/**
 * Space on the board that can contain tokens
 */
export interface Space {
  id: string;
  position: Position;
  tokens: Token[];
  metadata?: Record<string, any>;
}

/**
 * Game board
 */
export interface Board {
  spaces: Space[];
  metadata: Record<string, any>;
}

/**
 * Player in a game
 */
export interface Player {
  id: string;
  externalId?: string;
  name: string;
  joinedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Move made by a player
 * @template TParameters - Type of move parameters (game-specific)
 */
export interface Move<TParameters = Record<string, any>> {
  playerId: string;
  timestamp: Date;
  action: string;
  parameters: TParameters;
}

/**
 * Complete game state
 * @template TMetadata - Type of game-specific metadata
 */
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
  winner: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
