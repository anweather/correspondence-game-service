/**
 * TypeScript type definitions for the Async Boardgame Service API
 * These types represent the JSON responses from the REST API
 */

/**
 * Game lifecycle states
 */
export type GameLifecycle = 'created' | 'waiting_for_players' | 'active' | 'completed' | 'abandoned';

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
  joinedAt: string; // ISO 8601 timestamp
  metadata?: Record<string, any>;
}

/**
 * Move made by a player
 */
export interface Move<TParameters = Record<string, any>> {
  playerId: string;
  timestamp: string; // ISO 8601 timestamp
  action: string;
  parameters: TParameters;
}

/**
 * Complete game state
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
  version: number;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Game type metadata
 */
export interface GameType {
  type: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

/**
 * Configuration for creating a game
 */
export interface GameConfig {
  players?: Player[];
  customSettings?: Record<string, any>;
}

/**
 * Filters for querying games
 */
export interface GameFilters {
  playerId?: string;
  gameType?: string;
  lifecycle?: GameLifecycle;
  page?: number;
  pageSize?: number;
}

/**
 * Paginated list response
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API response for game list
 */
export type GameListResponse = PaginatedResult<GameState>;

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}
