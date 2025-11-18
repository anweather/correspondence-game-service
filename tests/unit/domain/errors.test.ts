import {
  GameError,
  GameNotFoundError,
  InvalidMoveError,
  ConcurrencyError,
  UnauthorizedMoveError,
  GameFullError,
} from '@domain/errors';

describe('Domain Error Classes', () => {
  describe('GameError base class', () => {
    it('should create error with message, code, and statusCode', () => {
      const error = new GameError('Test error message', 'TEST_ERROR', 500);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it('should create error with optional details', () => {
      const details = { field: 'gameId', value: 'invalid-id' };
      const error = new GameError('Test error', 'TEST_ERROR', 400, details);
      
      expect(error.details).toEqual(details);
    });

    it('should have proper error name', () => {
      const error = new GameError('Test error', 'TEST_ERROR', 500);
      
      expect(error.name).toBe('GameError');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new GameError('Test error', 'TEST_ERROR', 500);
      }).toThrow(GameError);
    });

    it('should preserve stack trace', () => {
      const error = new GameError('Test error', 'TEST_ERROR', 500);
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('GameError');
    });
  });

  describe('GameNotFoundError', () => {
    it('should create error with correct message and gameId', () => {
      const error = new GameNotFoundError('game-123');
      
      expect(error).toBeInstanceOf(GameError);
      expect(error.message).toBe('Game game-123 not found');
      expect(error.code).toBe('GAME_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should have proper error name', () => {
      const error = new GameNotFoundError('game-123');
      
      expect(error.name).toBe('GameNotFoundError');
    });

    it('should be throwable as GameError', () => {
      expect(() => {
        throw new GameNotFoundError('game-123');
      }).toThrow(GameError);
    });
  });

  describe('InvalidMoveError', () => {
    it('should create error with reason in message', () => {
      const reason = 'Space is already occupied';
      const error = new InvalidMoveError(reason);
      
      expect(error).toBeInstanceOf(GameError);
      expect(error.message).toBe('Invalid move: Space is already occupied');
      expect(error.code).toBe('INVALID_MOVE');
      expect(error.statusCode).toBe(400);
    });

    it('should include reason in details', () => {
      const reason = 'Not your turn';
      const error = new InvalidMoveError(reason);
      
      expect(error.details).toEqual({ reason });
    });

    it('should have proper error name', () => {
      const error = new InvalidMoveError('test reason');
      
      expect(error.name).toBe('InvalidMoveError');
    });

    it('should handle empty reason string', () => {
      const error = new InvalidMoveError('');
      
      expect(error.message).toBe('Invalid move: ');
      expect(error.details).toEqual({ reason: '' });
    });
  });

  describe('ConcurrencyError', () => {
    it('should create error with gameId in message', () => {
      const error = new ConcurrencyError('game-456');
      
      expect(error).toBeInstanceOf(GameError);
      expect(error.message).toBe('Game game-456 was modified by another request');
      expect(error.code).toBe('STALE_STATE');
      expect(error.statusCode).toBe(409);
    });

    it('should have proper error name', () => {
      const error = new ConcurrencyError('game-456');
      
      expect(error.name).toBe('ConcurrencyError');
    });

    it('should use 409 Conflict status code', () => {
      const error = new ConcurrencyError('game-456');
      
      expect(error.statusCode).toBe(409);
    });
  });

  describe('UnauthorizedMoveError', () => {
    it('should create error with playerId in message', () => {
      const error = new UnauthorizedMoveError('player-789');
      
      expect(error).toBeInstanceOf(GameError);
      expect(error.message).toBe('Player player-789 is not authorized to make this move');
      expect(error.code).toBe('UNAUTHORIZED_MOVE');
      expect(error.statusCode).toBe(403);
    });

    it('should have proper error name', () => {
      const error = new UnauthorizedMoveError('player-789');
      
      expect(error.name).toBe('UnauthorizedMoveError');
    });

    it('should use 403 Forbidden status code', () => {
      const error = new UnauthorizedMoveError('player-789');
      
      expect(error.statusCode).toBe(403);
    });
  });

  describe('GameFullError', () => {
    it('should create error with gameId in message', () => {
      const error = new GameFullError('game-999');
      
      expect(error).toBeInstanceOf(GameError);
      expect(error.message).toBe('Game game-999 is full');
      expect(error.code).toBe('GAME_FULL');
      expect(error.statusCode).toBe(409);
    });

    it('should have proper error name', () => {
      const error = new GameFullError('game-999');
      
      expect(error.name).toBe('GameFullError');
    });

    it('should use 409 Conflict status code', () => {
      const error = new GameFullError('game-999');
      
      expect(error.statusCode).toBe(409);
    });
  });

  describe('Error inheritance chain', () => {
    it('should allow catching all game errors with GameError', () => {
      const errors = [
        new GameNotFoundError('game-1'),
        new InvalidMoveError('test'),
        new ConcurrencyError('game-2'),
        new UnauthorizedMoveError('player-1'),
        new GameFullError('game-3'),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(GameError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('should allow catching specific error types', () => {
      try {
        throw new InvalidMoveError('test');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidMoveError);
        expect(error).toBeInstanceOf(GameError);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Error serialization', () => {
    it('should include all properties when converted to JSON', () => {
      const error = new InvalidMoveError('Space occupied');
      const json = JSON.parse(JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      }));

      expect(json.name).toBe('InvalidMoveError');
      expect(json.message).toBe('Invalid move: Space occupied');
      expect(json.code).toBe('INVALID_MOVE');
      expect(json.statusCode).toBe(400);
      expect(json.details).toEqual({ reason: 'Space occupied' });
    });
  });
});
