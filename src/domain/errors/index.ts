/**
 * Base error class for all game-related errors
 */
export class GameError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: any
  ) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a game instance is not found
 * HTTP Status: 404 Not Found
 */
export class GameNotFoundError extends GameError {
  constructor(gameId: string) {
    super(`Game ${gameId} not found`, 'GAME_NOT_FOUND', 404);
    this.name = 'GameNotFoundError';
  }
}

/**
 * Error thrown when a move is invalid according to game rules
 * HTTP Status: 400 Bad Request
 */
export class InvalidMoveError extends GameError {
  constructor(reason: string) {
    super(`Invalid move: ${reason}`, 'INVALID_MOVE', 400, { reason });
    this.name = 'InvalidMoveError';
  }
}

/**
 * Error thrown when a game state update conflicts with another concurrent update
 * HTTP Status: 409 Conflict
 */
export class ConcurrencyError extends GameError {
  constructor(gameId: string) {
    super(
      `Game ${gameId} was modified by another request`,
      'STALE_STATE',
      409
    );
    this.name = 'ConcurrencyError';
  }
}

/**
 * Error thrown when a player attempts to make a move they are not authorized to make
 * HTTP Status: 403 Forbidden
 */
export class UnauthorizedMoveError extends GameError {
  constructor(playerId: string) {
    super(
      `Player ${playerId} is not authorized to make this move`,
      'UNAUTHORIZED_MOVE',
      403
    );
    this.name = 'UnauthorizedMoveError';
  }
}

/**
 * Error thrown when attempting to join a game that is already full
 * HTTP Status: 409 Conflict
 */
export class GameFullError extends GameError {
  constructor(gameId: string) {
    super(`Game ${gameId} is full`, 'GAME_FULL', 409);
    this.name = 'GameFullError';
  }
}
