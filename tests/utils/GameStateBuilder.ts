import {
  GameState,
  Player,
  Move,
  Board,
  Space,
  Token,
  GameLifecycle,
} from '@domain/models';

/**
 * Builder class for creating GameState objects in tests.
 * Provides a fluent API for constructing test data with sensible defaults.
 * 
 * @example
 * const gameState = new GameStateBuilder()
 *   .withGameType('tic-tac-toe')
 *   .withPlayers([player1, player2])
 *   .withLifecycle(GameLifecycle.ACTIVE)
 *   .build();
 */
export class GameStateBuilder {
  private gameId: string = 'test-game-id';
  private gameType: string = 'test-game';
  private lifecycle: GameLifecycle = GameLifecycle.ACTIVE;
  private players: Player[] = [];
  private currentPlayerIndex: number = 0;
  private phase: string = 'main';
  private board: Board = { spaces: [], metadata: {} };
  private moveHistory: Move[] = [];
  private metadata: Record<string, any> = {};
  private version: number = 1;
  private createdAt: Date = new Date();
  private updatedAt: Date = new Date();

  /**
   * Set the game ID
   */
  withGameId(gameId: string): this {
    this.gameId = gameId;
    return this;
  }

  /**
   * Set the game type
   */
  withGameType(gameType: string): this {
    this.gameType = gameType;
    return this;
  }

  /**
   * Set the lifecycle state
   */
  withLifecycle(lifecycle: GameLifecycle): this {
    this.lifecycle = lifecycle;
    return this;
  }

  /**
   * Set the players
   */
  withPlayers(players: Player[]): this {
    this.players = players;
    return this;
  }

  /**
   * Add a single player
   */
  addPlayer(player: Player): this {
    this.players.push(player);
    return this;
  }

  /**
   * Set the current player index
   */
  withCurrentPlayerIndex(index: number): this {
    this.currentPlayerIndex = index;
    return this;
  }

  /**
   * Set the game phase
   */
  withPhase(phase: string): this {
    this.phase = phase;
    return this;
  }

  /**
   * Set the board
   */
  withBoard(board: Board): this {
    this.board = board;
    return this;
  }

  /**
   * Add a space to the board
   */
  addSpace(space: Space): this {
    this.board.spaces.push(space);
    return this;
  }

  /**
   * Set the move history
   */
  withMoveHistory(moves: Move[]): this {
    this.moveHistory = moves;
    return this;
  }

  /**
   * Add a move to the history
   */
  addMove(move: Move): this {
    this.moveHistory.push(move);
    return this;
  }

  /**
   * Set custom metadata
   */
  withMetadata(metadata: Record<string, any>): this {
    this.metadata = metadata;
    return this;
  }

  /**
   * Set the version number
   */
  withVersion(version: number): this {
    this.version = version;
    return this;
  }

  /**
   * Set the creation timestamp
   */
  withCreatedAt(date: Date): this {
    this.createdAt = date;
    return this;
  }

  /**
   * Set the update timestamp
   */
  withUpdatedAt(date: Date): this {
    this.updatedAt = date;
    return this;
  }

  /**
   * Build the GameState object
   */
  build(): GameState {
    return {
      gameId: this.gameId,
      gameType: this.gameType,
      lifecycle: this.lifecycle,
      players: this.players,
      currentPlayerIndex: this.currentPlayerIndex,
      phase: this.phase,
      board: this.board,
      moveHistory: this.moveHistory,
      metadata: this.metadata,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/**
 * Helper function to create a basic player
 */
export function createPlayer(
  id: string,
  name: string = `Player ${id}`,
  metadata?: Record<string, any>
): Player {
  return {
    id,
    name,
    joinedAt: new Date(),
    metadata,
  };
}

/**
 * Helper function to create a basic move
 */
export function createMove(
  playerId: string,
  action: string,
  parameters: Record<string, any> = {}
): Move {
  return {
    playerId,
    timestamp: new Date(),
    action,
    parameters,
  };
}

/**
 * Helper function to create a basic space
 */
export function createSpace(
  id: string,
  x: number,
  y: number,
  tokens: Token[] = [],
  metadata?: Record<string, any>
): Space {
  return {
    id,
    position: { x, y },
    tokens,
    metadata,
  };
}

/**
 * Helper function to create a basic token
 */
export function createToken(
  id: string,
  type: string,
  ownerId?: string,
  metadata?: Record<string, any>
): Token {
  return {
    id,
    type,
    ownerId,
    metadata,
  };
}
