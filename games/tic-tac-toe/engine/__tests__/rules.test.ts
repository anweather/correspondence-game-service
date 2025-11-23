/**
 * Tests for Tic-Tac-Toe rules module
 */

import { GameState, Player, Move } from '@domain/models';
import { applyMove, isGameOver, getWinner, checkWinPattern, isBoardFull } from '../rules';
import { initializeGame } from '../initialization';

describe('Tic-Tac-Toe Rules Module', () => {
  let testPlayers: Player[];
  let initialState: GameState;

  beforeEach(() => {
    testPlayers = [
      { id: 'player-1', name: 'Alice', joinedAt: new Date() },
      { id: 'player-2', name: 'Bob', joinedAt: new Date() },
    ];
    initialState = initializeGame(testPlayers, {});
  });

  describe('applyMove', () => {
    it('should place token on board', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      };
      const newState = applyMove(initialState, 'player-1', move);
      const space = newState.board.spaces.find((s) => s.id === '1,1');
      expect(space?.tokens).toHaveLength(1);
      expect(space?.tokens[0].type).toBe('X');
      expect(space?.tokens[0].ownerId).toBe('player-1');
    });

    it('should place X for first player', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const newState = applyMove(initialState, 'player-1', move);
      const space = newState.board.spaces.find((s) => s.id === '0,0');
      expect(space?.tokens[0].type).toBe('X');
    });

    it('should place O for second player', () => {
      const move: Move = {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      };
      const newState = applyMove(initialState, 'player-2', move);
      const space = newState.board.spaces.find((s) => s.id === '1,1');
      expect(space?.tokens[0].type).toBe('O');
    });

    it('should add move to history', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const newState = applyMove(initialState, 'player-1', move);
      expect(newState.moveHistory).toHaveLength(1);
      expect(newState.moveHistory[0]).toEqual(move);
    });

    it('should increment version', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const newState = applyMove(initialState, 'player-1', move);
      expect(newState.version).toBe(initialState.version + 1);
    });

    it('should not mutate original state', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const originalVersion = initialState.version;
      const originalHistoryLength = initialState.moveHistory.length;
      applyMove(initialState, 'player-1', move);
      expect(initialState.version).toBe(originalVersion);
      expect(initialState.moveHistory).toHaveLength(originalHistoryLength);
    });
  });

  describe('isBoardFull', () => {
    it('should return false for empty board', () => {
      expect(isBoardFull(initialState)).toBe(false);
    });

    it('should return false for partially filled board', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      expect(isBoardFull(state)).toBe(false);
    });

    it('should return true for completely filled board', () => {
      let state = initialState;
      const moves = [
        { player: 'player-1', row: 0, col: 0 },
        { player: 'player-2', row: 0, col: 1 },
        { player: 'player-1', row: 0, col: 2 },
        { player: 'player-2', row: 1, col: 1 },
        { player: 'player-1', row: 1, col: 0 },
        { player: 'player-2', row: 1, col: 2 },
        { player: 'player-1', row: 2, col: 1 },
        { player: 'player-2', row: 2, col: 0 },
        { player: 'player-1', row: 2, col: 2 },
      ];
      moves.forEach((m) => {
        state = applyMove(state, m.player, {
          playerId: m.player,
          timestamp: new Date(),
          action: 'place',
          parameters: { row: m.row, col: m.col },
        });
      });
      expect(isBoardFull(state)).toBe(true);
    });
  });

  describe('checkWinPattern', () => {
    it('should return null for empty pattern', () => {
      const pattern = ['0,0', '0,1', '0,2'];
      expect(checkWinPattern(initialState, pattern)).toBeNull();
    });

    it('should return null for incomplete pattern', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      const pattern = ['0,0', '0,1', '0,2'];
      expect(checkWinPattern(state, pattern)).toBeNull();
    });

    it('should return null for pattern with mixed players', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      const pattern = ['0,0', '0,1', '0,2'];
      expect(checkWinPattern(state, pattern)).toBeNull();
    });

    it('should return player ID for complete pattern', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      const pattern = ['0,0', '0,1', '0,2'];
      expect(checkWinPattern(state, pattern)).toBe('player-1');
    });
  });

  describe('getWinner', () => {
    it('should return null for new game', () => {
      expect(getWinner(initialState)).toBeNull();
    });

    it('should detect horizontal win in top row', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      expect(getWinner(state)).toBe('player-1');
    });

    it('should detect vertical win in left column', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 0 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 0 },
      });
      expect(getWinner(state)).toBe('player-1');
    });

    it('should detect diagonal win (top-left to bottom-right)', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 2 },
      });
      expect(getWinner(state)).toBe('player-1');
    });

    it('should detect diagonal win (top-right to bottom-left)', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 0 },
      });
      expect(getWinner(state)).toBe('player-1');
    });

    it('should return null with incomplete line', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      expect(getWinner(state)).toBeNull();
    });
  });

  describe('isGameOver', () => {
    it('should return false for new game', () => {
      expect(isGameOver(initialState)).toBe(false);
    });

    it('should return true when there is a winner', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      expect(isGameOver(state)).toBe(true);
    });

    it('should return true when board is full (draw)', () => {
      let state = initialState;
      const moves = [
        { player: 'player-1', row: 0, col: 0 },
        { player: 'player-2', row: 0, col: 1 },
        { player: 'player-1', row: 0, col: 2 },
        { player: 'player-2', row: 1, col: 1 },
        { player: 'player-1', row: 1, col: 0 },
        { player: 'player-2', row: 1, col: 2 },
        { player: 'player-1', row: 2, col: 1 },
        { player: 'player-2', row: 2, col: 0 },
        { player: 'player-1', row: 2, col: 2 },
      ];
      moves.forEach((m) => {
        state = applyMove(state, m.player, {
          playerId: m.player,
          timestamp: new Date(),
          action: 'place',
          parameters: { row: m.row, col: m.col },
        });
      });
      expect(isGameOver(state)).toBe(true);
      expect(getWinner(state)).toBeNull();
    });

    it('should return false when board is not full and no winner', () => {
      let state = initialState;
      state = applyMove(state, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      expect(isGameOver(state)).toBe(false);
    });
  });
});
