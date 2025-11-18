import { GameState, Player, Move } from '@domain/models';

/**
 * Configuration for initializing a game
 */
export interface GameConfig {
  players?: Player[];
  customSettings?: Record<string, any>;
}

/**
 * Result of move validation
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Render data for a single space on the board
 */
export interface SpaceRenderData {
  id: string;
  position: { x: number; y: number };
  tokens: TokenRenderData[];
  metadata?: Record<string, any>;
}

/**
 * Render data for a token
 */
export interface TokenRenderData {
  id: string;
  type: string;
  color?: string;
  icon?: string;
  label?: string;
}

/**
 * A layer in the rendering system
 */
export interface RenderLayer {
  name: string;
  zIndex: number;
  elements: RenderElement[];
}

/**
 * A single render element (shape, text, image, etc.)
 */
export interface RenderElement {
  type: 'rect' | 'circle' | 'path' | 'text' | 'image';
  attributes: Record<string, any>;
}

/**
 * Complete board rendering data
 */
export interface BoardRenderData {
  viewBox: { width: number; height: number };
  backgroundColor?: string;
  spaces: SpaceRenderData[];
  layers: RenderLayer[];
}

/**
 * Game engine plugin interface
 * Defines the contract for implementing custom board game logic
 */
export interface GameEnginePlugin {
  // Metadata methods
  getGameType(): string;
  getMinPlayers(): number;
  getMaxPlayers(): number;
  getDescription(): string;

  // Lifecycle hooks
  onGameCreated(state: GameState, config: GameConfig): void;
  onPlayerJoined(state: GameState, playerId: string): void;
  onGameStarted(state: GameState): void;
  onGameEnded(state: GameState): void;

  // Core game logic with optional hooks
  beforeInitializeGame?(players: Player[], config: GameConfig): void;
  initializeGame(players: Player[], config: GameConfig): GameState;
  afterInitializeGame?(state: GameState): void;

  beforeValidateMove?(state: GameState, playerId: string, move: Move): void;
  validateMove(state: GameState, playerId: string, move: Move): ValidationResult;
  afterValidateMove?(
    state: GameState,
    playerId: string,
    move: Move,
    result: ValidationResult
  ): void;

  beforeApplyMove?(state: GameState, playerId: string, move: Move): void;
  applyMove(state: GameState, playerId: string, move: Move): GameState;
  afterApplyMove?(oldState: GameState, newState: GameState, move: Move): void;

  isGameOver(state: GameState): boolean;
  getWinner(state: GameState): string | null;

  // Turn management
  getCurrentPlayer(state: GameState): string;
  getNextPlayer(state: GameState): string;
  advanceTurn(state: GameState): GameState;

  // Rendering with optional hooks
  beforeRenderBoard?(state: GameState): void;
  renderBoard(state: GameState): BoardRenderData;
  afterRenderBoard?(state: GameState, renderData: BoardRenderData): void;
}

/**
 * Abstract base class for game engines
 * Provides default implementations for optional hooks and utility methods
 */
export abstract class BaseGameEngine implements GameEnginePlugin {
  // Abstract metadata methods - must be implemented by subclasses
  abstract getGameType(): string;
  abstract getMinPlayers(): number;
  abstract getMaxPlayers(): number;
  abstract getDescription(): string;

  // Abstract core methods - must be implemented by subclasses
  abstract initializeGame(players: Player[], config: GameConfig): GameState;
  abstract validateMove(
    state: GameState,
    playerId: string,
    move: Move
  ): ValidationResult;
  abstract applyMove(state: GameState, playerId: string, move: Move): GameState;
  abstract renderBoard(state: GameState): BoardRenderData;

  // Lifecycle hooks - default no-op implementations
  onGameCreated(_state: GameState, _config: GameConfig): void {
    // Default: no-op
  }

  onPlayerJoined(_state: GameState, _playerId: string): void {
    // Default: no-op
  }

  onGameStarted(_state: GameState): void {
    // Default: no-op
  }

  onGameEnded(_state: GameState): void {
    // Default: no-op
  }

  // Optional hooks - default no-op implementations
  beforeInitializeGame?(_players: Player[], _config: GameConfig): void {
    // Default: no-op
  }

  afterInitializeGame?(_state: GameState): void {
    // Default: no-op
  }

  beforeValidateMove?(_state: GameState, _playerId: string, _move: Move): void {
    // Default: no-op
  }

  afterValidateMove?(
    _state: GameState,
    _playerId: string,
    _move: Move,
    _result: ValidationResult
  ): void {
    // Default: no-op
  }

  beforeApplyMove?(_state: GameState, _playerId: string, _move: Move): void {
    // Default: no-op
  }

  afterApplyMove?(_oldState: GameState, _newState: GameState, _move: Move): void {
    // Default: no-op
  }

  beforeRenderBoard?(_state: GameState): void {
    // Default: no-op
  }

  afterRenderBoard?(_state: GameState, _renderData: BoardRenderData): void {
    // Default: no-op
  }

  // Default implementations for game state queries
  isGameOver(_state: GameState): boolean {
    return false;
  }

  getWinner(_state: GameState): string | null {
    return null;
  }

  // Turn management - default implementations
  getCurrentPlayer(state: GameState): string {
    return state.players[state.currentPlayerIndex].id;
  }

  getNextPlayer(state: GameState): string {
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return state.players[nextIndex].id;
  }

  advanceTurn(state: GameState): GameState {
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return {
      ...state,
      currentPlayerIndex: nextIndex,
    };
  }

  // Utility methods for common operations
  findPlayerById(state: GameState, playerId: string): Player | undefined {
    return state.players.find((p) => p.id === playerId);
  }

  isPlayerInGame(state: GameState, playerId: string): boolean {
    return state.players.some((p) => p.id === playerId);
  }
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Filters for querying games
 */
export interface GameFilters {
  playerId?: string;
  lifecycle?: string;
  gameType?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Repository interface for game state persistence
 */
export interface GameRepository {
  /**
   * Save a new game state
   */
  save(state: GameState): Promise<void>;

  /**
   * Find a game by its ID
   */
  findById(gameId: string): Promise<GameState | null>;

  /**
   * Find games by player ID with optional filters and pagination
   */
  findByPlayer(
    playerId: string,
    filters: GameFilters
  ): Promise<PaginatedResult<GameState>>;

  /**
   * Update an existing game state with optimistic locking
   * @throws ConcurrencyError if version mismatch
   */
  update(
    gameId: string,
    state: GameState,
    expectedVersion: number
  ): Promise<GameState>;

  /**
   * Delete a game by its ID
   */
  delete(gameId: string): Promise<void>;
}
