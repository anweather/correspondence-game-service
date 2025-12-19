/**
 * Base error class for all game-related errors
 */
export class GameError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
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
    super(`Game ${gameId} was modified by another request`, 'STALE_STATE', 409);
    this.name = 'ConcurrencyError';
  }
}

/**
 * Error thrown when a player attempts to make a move they are not authorized to make
 * HTTP Status: 403 Forbidden
 */
export class UnauthorizedMoveError extends GameError {
  constructor(playerId: string) {
    super(`Player ${playerId} is not authorized to make this move`, 'UNAUTHORIZED_MOVE', 403);
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

/**
 * Error thrown when authentication is required but not provided
 * HTTP Status: 401 Unauthorized
 * Requirements: 8.1
 */
export class AuthenticationRequiredError extends GameError {
  constructor() {
    super('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Error thrown when an authentication token is invalid or expired
 * HTTP Status: 401 Unauthorized
 * Requirements: 8.2, 8.3
 */
export class InvalidTokenError extends GameError {
  constructor(reason: 'missing' | 'malformed' | 'expired' | 'invalid') {
    const isExpired = reason === 'expired';
    const message = isExpired ? 'Authentication token expired' : 'Invalid authentication token';
    const code = isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';

    super(message, code, 401, { reason });
    this.name = 'InvalidTokenError';
  }
}

/**
 * Error thrown when a user is authenticated but not authorized for a resource
 * HTTP Status: 403 Forbidden
 * Requirements: 8.5
 */
export class ForbiddenError extends GameError {
  constructor(message: string = 'Access denied') {
    super(`Forbidden: ${message}`, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error thrown when an AI strategy is not found for a game type
 * HTTP Status: 404 Not Found
 */
export class AIStrategyNotFoundError extends GameError {
  constructor(gameType: string, strategyId: string) {
    super(
      `AI strategy '${strategyId}' not found for game type '${gameType}'`,
      'AI_STRATEGY_NOT_FOUND',
      404,
      {
        gameType,
        strategyId,
      }
    );
    this.name = 'AIStrategyNotFoundError';
  }
}

/**
 * Error thrown when AI move generation fails
 * HTTP Status: 500 Internal Server Error
 */
export class AIMoveGenerationError extends GameError {
  constructor(aiPlayerId: string, cause?: Error) {
    super(
      `AI player '${aiPlayerId}' failed to generate move: ${cause?.message || 'Unknown error'}`,
      'AI_MOVE_GENERATION_ERROR',
      500,
      {
        aiPlayerId,
        cause: cause?.message,
      }
    );
    this.name = 'AIMoveGenerationError';
  }
}

/**
 * Error thrown when AI move generation exceeds time limit
 * HTTP Status: 408 Request Timeout
 */
export class AITimeoutError extends GameError {
  constructor(aiPlayerId: string, timeLimit: number) {
    super(`AI player '${aiPlayerId}' exceeded time limit of ${timeLimit}ms`, 'AI_TIMEOUT', 408, {
      aiPlayerId,
      timeLimit,
    });
    this.name = 'AITimeoutError';
  }
}

/**
 * Error thrown when AI player configuration is invalid
 * HTTP Status: 400 Bad Request
 */
export class InvalidAIConfigurationError extends GameError {
  constructor(reason: string, config?: Record<string, any>) {
    super(`Invalid AI configuration: ${reason}`, 'INVALID_AI_CONFIGURATION', 400, {
      reason,
      config,
    });
    this.name = 'InvalidAIConfigurationError';
  }
}
