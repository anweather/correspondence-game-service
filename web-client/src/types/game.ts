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
  metadata?: {
    isAI?: boolean;
    strategyId?: string;
    difficulty?: string;
    configuration?: Record<string, any>;
    [key: string]: any;
  };
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
 * Move input from UI (before playerId and timestamp are added)
 */
export interface MoveInput<TParameters = Record<string, any>> {
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
  metadata: TMetadata & {
    hasAIPlayers?: boolean;
    aiPlayerCount?: number;
  };
  version: number;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  winner?: string | null; // Player ID of the winner, null for draw, undefined if not yet determined
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
 * Configuration for creating AI players
 */
export interface AIPlayerConfig {
  name: string;
  strategyId?: string; // Optional - uses default if not specified
  difficulty?: string;
  configuration?: Record<string, any>;
}

/**
 * Configuration for creating a game
 */
export interface GameConfig {
  players?: Player[];
  aiPlayers?: AIPlayerConfig[];
  customSettings?: Record<string, any>;
  gameName?: string;
  gameDescription?: string;
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

/**
 * Player statistics
 */
export interface PlayerStats {
  userId: string;
  gameType?: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalTurns: number;
  averageTurnsPerGame: number;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}

/**
 * Filters for game history
 */
export interface GameHistoryFilters {
  gameType?: string;
  lifecycle?: GameLifecycle;
  page?: number;
  pageSize?: number;
}

/**
 * Game invitation status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * Game invitation
 */
export interface GameInvitation {
  invitationId: string;
  gameId: string;
  inviterId: string;
  inviteeId: string;
  status: InvitationStatus;
  createdAt: string; // ISO 8601 timestamp
  respondedAt?: string; // ISO 8601 timestamp
}
