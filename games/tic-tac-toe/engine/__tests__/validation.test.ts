import { GameState, Player, Move, GameLifecycle } from '../../../../src/domain/models';
import {
  validateMove,
  isValidPosition,
  isSpaceOccupied,
  isPlayerTurn,
} from '../validation';

describe('Validation Module', () => {
  let testPlayers: Player[];
  let baseGameState: GameState;

  beforeEach(() => {
    testPlayers = [
      { id: 'player-1', name: 'Alice', joinedAt: new Date() },
      { id: 'player-2', name: 'Bob', joinedAt: new Date() },
    ];

    // Create a basic game state for testing
    baseGameState = {
      gameId: 'test-game',
      gameType: 'tic-tac-toe',
      lifecycle: GameLifecycle.ACTIVE,
      players: testPlayers,
      currentPlayerIndex: 0,
      phase: 'main',
      board: {
        spaces: [
          { id: '0,0', position: { x: 0, y: 0 }, tokens: [] },
          { id: '0,1', position: { x: 1, y: 0 }, tokens: [] },
          { id: '0,2', position: { x: 2, y: 0 }, tokens: [] },
          { id: '1,0', position: { x: 0, y: 1 }, tokens: [] },
          { id: '1,1', position: { x: 1, y: 1 }, tokens: [] },
          { id: '1,2', position: { x: 2, y: 1 }, tokens: [] },
          { id: '2,0', position: { x: 0, y: 2 }, tokens: [] },
          { id: '2,1', position: { x: 1, y: 2 }, tokens: [] },
          { id: '2,2', position: { x: 2, y: 2 }, tokens: [] },
        ],
        metadata: {},
      },
      moveHistory: [],
      metadata: { boardSize: 3 },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(isValidPosition(0, 0)).toBe(true);
      expect(isValidPosition(1, 1)).toBe(true);
      expect(isValidPosition(2, 2)).toBe(true);
    });

    it('should return false for negative row', () => {
      expect(isValidPosition(-1, 0)).toBe(false);
    });

    it('should return false for negative col', () => {
      expect(isValidPosition(0, -1)).toBe(false);
    });

    it('should return false for row >= BOARD_SIZE', () => {
      expect(isValidPosition(3, 0)).toBe(false);
      expect(isValidPosition(4, 0)).toBe(false);
    });

    it('should return false for col >= BOARD_SIZE', () => {
      expect(isValidPosition(0, 3)).toBe(false);
      expect(isValidPosition(0, 4)).toBe(false);
    });
  });

  describe('isSpaceOccupied', () => {
    it('should return false for empty space', () => {
      expect(isSpaceOccupied(baseGameState, 0, 0)).toBe(false);
      expect(isSpaceOccupied(baseGameState, 1, 1)).toBe(false);
    });

    it('should return true for occupied space', () => {
      const stateWithToken = {
        ...baseGameState,
        board: {
          ...baseGameState.board,
          spaces: baseGameState.board.spaces.map((space) =>
            space.id === '1,1'
              ? {
                  ...space,
                  tokens: [{ id: 'token-1', type: 'X', ownerId: 'player-1' }],
                }
              : space
          ),
        },
      };
      expect(isSpaceOccupied(stateWithToken, 1, 1)).toBe(true);
    });

    it('should return false for non-existent space', () => {
      expect(isSpaceOccupied(baseGameState, 5, 5)).toBe(false);
    });
  });

  describe('isPlayerTurn', () => {
    it('should return true for current player', () => {
      expect(isPlayerTurn(baseGameState, 'player-1')).toBe(true);
    });

    it('should return false for non-current player', () => {
      expect(isPlayerTurn(baseGameState, 'player-2')).toBe(false);
    });

    it('should return true for second player when it is their turn', () => {
      const stateWithPlayer2Turn = {
        ...baseGameState,
        currentPlayerIndex: 1,
      };
      expect(isPlayerTurn(stateWithPlayer2Turn, 'player-2')).toBe(true);
      expect(isPlayerTurn(stateWithPlayer2Turn, 'player-1')).toBe(false);
    });
  });

  describe('validateMove', () => {
    it('should validate move to empty space by current player', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const result = validateMove(baseGameState, 'player-1', move);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject move by wrong player', () => {
      const move: Move = {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const result = validateMove(baseGameState, 'player-2', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not your turn');
    });

    it('should reject move with row out of bounds', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: -1, col: 0 },
      };
      const result = validateMove(baseGameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Position out of bounds');
    });

    it('should reject move with col out of bounds', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 3 },
      };
      const result = validateMove(baseGameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Position out of bounds');
    });

    it('should reject move to occupied space', () => {
      const stateWithToken = {
        ...baseGameState,
        board: {
          ...baseGameState.board,
          spaces: baseGameState.board.spaces.map((space) =>
            space.id === '0,0'
              ? {
                  ...space,
                  tokens: [{ id: 'token-1', type: 'X', ownerId: 'player-1' }],
                }
              : space
          ),
        },
      };
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const result = validateMove(stateWithToken, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Space is already occupied');
    });

    it('should validate all valid positions on empty board', () => {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const move: Move = {
            playerId: 'player-1',
            timestamp: new Date(),
            action: 'place',
            parameters: { row, col },
          };
          const result = validateMove(baseGameState, 'player-1', move);
          expect(result.valid).toBe(true);
        }
      }
    });
  });
});
