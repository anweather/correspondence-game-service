/**
 * Tests for tic-tac-toe initialization module
 */

import { Player, GameLifecycle } from '@domain/models';
import { initializeGame, createEmptyBoard } from '../initialization';
import { BOARD_SIZE } from '@games/tic-tac-toe/shared';

describe('Tic-Tac-Toe Initialization Module', () => {
  let testPlayers: Player[];

  beforeEach(() => {
    testPlayers = [
      { id: 'player-1', name: 'Alice', joinedAt: new Date() },
      { id: 'player-2', name: 'Bob', joinedAt: new Date() },
    ];
  });

  describe('createEmptyBoard', () => {
    it('should create a board with correct number of spaces', () => {
      const board = createEmptyBoard();
      expect(board.spaces).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    });

    it('should create spaces with correct positions', () => {
      const board = createEmptyBoard();
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const space = board.spaces.find(
            (s) => s.position.x === col && s.position.y === row
          );
          expect(space).toBeDefined();
          expect(space?.id).toBe(`${row},${col}`);
        }
      }
    });

    it('should create spaces with no tokens', () => {
      const board = createEmptyBoard();
      board.spaces.forEach((space) => {
        expect(space.tokens).toHaveLength(0);
      });
    });

    it('should create board with empty metadata', () => {
      const board = createEmptyBoard();
      expect(board.metadata).toBeDefined();
      expect(Object.keys(board.metadata)).toHaveLength(0);
    });
  });

  describe('initializeGame', () => {
    it('should create game state with correct game type', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.gameType).toBe('tic-tac-toe');
    });

    it('should create game state with active lifecycle', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.lifecycle).toBe(GameLifecycle.ACTIVE);
    });

    it('should assign players to game state', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.players).toHaveLength(2);
      expect(state.players[0].id).toBe('player-1');
      expect(state.players[1].id).toBe('player-2');
    });

    it('should set first player as current player', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.currentPlayerIndex).toBe(0);
    });

    it('should initialize with main phase', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.phase).toBe('main');
    });

    it('should create empty board', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.board.spaces).toHaveLength(9);
      state.board.spaces.forEach((space) => {
        expect(space.tokens).toHaveLength(0);
      });
    });

    it('should initialize with empty move history', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.moveHistory).toHaveLength(0);
    });

    it('should set metadata with board size', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.metadata.boardSize).toBe(BOARD_SIZE);
    });

    it('should initialize with version 1', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.version).toBe(1);
    });

    it('should set createdAt timestamp', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.createdAt).toBeInstanceOf(Date);
    });

    it('should set updatedAt timestamp', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.updatedAt).toBeInstanceOf(Date);
    });

    it('should use custom gameId from config if provided', () => {
      const customId = 'custom-game-123';
      const state = initializeGame(testPlayers, {
        customSettings: { gameId: customId },
      });
      expect(state.gameId).toBe(customId);
    });

    it('should generate gameId if not provided in config', () => {
      const state = initializeGame(testPlayers, {});
      expect(state.gameId).toBeDefined();
      expect(state.gameId).toMatch(/^ttt-\d+$/);
    });
  });
});
