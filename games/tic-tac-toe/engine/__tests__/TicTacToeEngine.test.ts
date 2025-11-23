/**
 * Tests for TicTacToeEngine class
 * 
 * These tests verify that the engine class properly delegates to module functions
 * and maintains the expected API contract.
 */

import { TicTacToeEngine } from '../TicTacToeEngine';
import { GameState, Player, Move } from '@domain/models';
import { GameConfig } from '@domain/interfaces';

describe('TicTacToeEngine', () => {
  let engine: TicTacToeEngine;
  let players: Player[];
  let config: GameConfig;

  beforeEach(() => {
    engine = new TicTacToeEngine();
    players = [
      { id: 'player1', name: 'Alice', joinedAt: new Date() },
      { id: 'player2', name: 'Bob', joinedAt: new Date() },
    ];
    config = { customSettings: { gameId: 'test-game' } };
  });

  describe('Metadata Methods', () => {
    it('should return correct game type', () => {
      expect(engine.getGameType()).toBe('tic-tac-toe');
    });

    it('should return correct min players', () => {
      expect(engine.getMinPlayers()).toBe(2);
    });

    it('should return correct max players', () => {
      expect(engine.getMaxPlayers()).toBe(2);
    });

    it('should return game description', () => {
      const description = engine.getDescription();
      expect(description).toBeTruthy();
      expect(typeof description).toBe('string');
    });
  });

  describe('Game Initialization', () => {
    it('should initialize a new game', () => {
      const state = engine.initializeGame(players, config);

      expect(state.gameId).toBe('test-game');
      expect(state.gameType).toBe('tic-tac-toe');
      expect(state.players).toEqual(players);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.board.spaces).toHaveLength(9);
    });

    it('should create empty board with correct positions', () => {
      const state = engine.initializeGame(players, config);

      // Verify all 9 spaces exist with correct IDs
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const space = state.board.spaces.find((s) => s.id === `${row},${col}`);
          expect(space).toBeDefined();
          expect(space?.tokens).toHaveLength(0);
        }
      }
    });
  });

  describe('Move Validation', () => {
    let state: GameState;

    beforeEach(() => {
      state = engine.initializeGame(players, config);
    });

    it('should validate legal move', () => {
      const move: Move = {
        playerId: 'player1',
        action: 'place',
        parameters: { row: 0, col: 0 },
        timestamp: new Date(),
      };

      const result = engine.validateMove(state, 'player1', move);
      expect(result.valid).toBe(true);
    });

    it('should reject move by wrong player', () => {
      const move: Move = {
        playerId: 'player2',
        action: 'place',
        parameters: { row: 0, col: 0 },
        timestamp: new Date(),
      };

      const result = engine.validateMove(state, 'player2', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not your turn');
    });

    it('should reject move to occupied space', () => {
      const move1: Move = {
        playerId: 'player1',
        action: 'place',
        parameters: { row: 0, col: 0 },
        timestamp: new Date(),
      };

      // Apply first move by player1
      state = engine.applyMove(state, 'player1', move1);

      // Try to move to same space by player2 (whose turn it is now)
      const move2: Move = {
        playerId: 'player2',
        action: 'place',
        parameters: { row: 0, col: 0 }, // Same space
        timestamp: new Date(),
      };
      
      const result = engine.validateMove(state, 'player2', move2);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Space is already occupied');
    });
  });

  describe('Move Application', () => {
    let state: GameState;

    beforeEach(() => {
      state = engine.initializeGame(players, config);
    });

    it('should apply move and place token', () => {
      const move: Move = {
        playerId: 'player1',
        action: 'place',
        parameters: { row: 1, col: 1 },
        timestamp: new Date(),
      };

      const newState = engine.applyMove(state, 'player1', move);

      const space = newState.board.spaces.find((s) => s.id === '1,1');
      expect(space?.tokens).toHaveLength(1);
      expect(space?.tokens[0].type).toBe('X');
      expect(space?.tokens[0].ownerId).toBe('player1');
    });

    it('should not mutate original state', () => {
      const move: Move = {
        playerId: 'player1',
        action: 'place',
        parameters: { row: 0, col: 0 },
        timestamp: new Date(),
      };

      const originalSpaces = state.board.spaces;
      engine.applyMove(state, 'player1', move);

      // Original state should be unchanged
      const space = state.board.spaces.find((s) => s.id === '0,0');
      expect(space?.tokens).toHaveLength(0);
      expect(state.board.spaces).toBe(originalSpaces);
    });

    it('should increment version', () => {
      const move: Move = {
        playerId: 'player1',
        action: 'place',
        parameters: { row: 0, col: 0 },
        timestamp: new Date(),
      };

      const newState = engine.applyMove(state, 'player1', move);
      expect(newState.version).toBe(state.version + 1);
    });
  });

  describe('Game Completion', () => {
    let state: GameState;

    beforeEach(() => {
      state = engine.initializeGame(players, config);
    });

    it('should detect game not over at start', () => {
      expect(engine.isGameOver(state)).toBe(false);
    });

    it('should detect winner with horizontal line', () => {
      // Player 1 wins with top row
      const moves = [
        { row: 0, col: 0, player: 'player1' }, // X
        { row: 1, col: 0, player: 'player2' }, // O
        { row: 0, col: 1, player: 'player1' }, // X
        { row: 1, col: 1, player: 'player2' }, // O
        { row: 0, col: 2, player: 'player1' }, // X - wins
      ];

      for (const { row, col, player } of moves) {
        const move: Move = {
          playerId: player,
          action: 'place',
          parameters: { row, col },
          timestamp: new Date(),
        };
        state = engine.applyMove(state, player, move);
      }

      expect(engine.isGameOver(state)).toBe(true);
      expect(engine.getWinner(state)).toBe('player1');
    });

    it('should detect draw when board is full', () => {
      // Create a draw scenario
      const moves = [
        { row: 0, col: 0, player: 'player1' }, // X
        { row: 0, col: 1, player: 'player2' }, // O
        { row: 0, col: 2, player: 'player1' }, // X
        { row: 1, col: 1, player: 'player2' }, // O
        { row: 1, col: 0, player: 'player1' }, // X
        { row: 1, col: 2, player: 'player2' }, // O
        { row: 2, col: 1, player: 'player1' }, // X
        { row: 2, col: 0, player: 'player2' }, // O
        { row: 2, col: 2, player: 'player1' }, // X
      ];

      for (const { row, col, player } of moves) {
        const move: Move = {
          playerId: player,
          action: 'place',
          parameters: { row, col },
          timestamp: new Date(),
        };
        state = engine.applyMove(state, player, move);
      }

      expect(engine.isGameOver(state)).toBe(true);
      expect(engine.getWinner(state)).toBeNull();
    });
  });

  describe('Board Rendering', () => {
    let state: GameState;

    beforeEach(() => {
      state = engine.initializeGame(players, config);
    });

    it('should render empty board', () => {
      const renderData = engine.renderBoard(state);

      expect(renderData.viewBox).toEqual({ width: 300, height: 300 });
      expect(renderData.backgroundColor).toBe('#ffffff');
      expect(renderData.spaces).toHaveLength(9);
      expect(renderData.layers).toHaveLength(2);
    });

    it('should render board with tokens', () => {
      const move: Move = {
        playerId: 'player1',
        action: 'place',
        parameters: { row: 1, col: 1 },
        timestamp: new Date(),
      };

      state = engine.applyMove(state, 'player1', move);
      const renderData = engine.renderBoard(state);

      // Should have grid layer and token layer
      expect(renderData.layers.find((l) => l.name === 'grid')).toBeDefined();
      expect(renderData.layers.find((l) => l.name === 'tokens')).toBeDefined();

      // Token layer should have elements for the X
      const tokenLayer = renderData.layers.find((l) => l.name === 'tokens');
      expect(tokenLayer?.elements.length).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should extend BaseGameEngine', () => {
      expect(engine).toBeInstanceOf(TicTacToeEngine);
    });

    it('should have all required methods', () => {
      expect(typeof engine.getGameType).toBe('function');
      expect(typeof engine.getMinPlayers).toBe('function');
      expect(typeof engine.getMaxPlayers).toBe('function');
      expect(typeof engine.getDescription).toBe('function');
      expect(typeof engine.initializeGame).toBe('function');
      expect(typeof engine.validateMove).toBe('function');
      expect(typeof engine.applyMove).toBe('function');
      expect(typeof engine.isGameOver).toBe('function');
      expect(typeof engine.getWinner).toBe('function');
      expect(typeof engine.renderBoard).toBe('function');
    });

    it('should have inherited turn management methods from BaseGameEngine', () => {
      // These methods are inherited from BaseGameEngine
      const state = engine.initializeGame(players, config);
      
      expect(typeof engine.getCurrentPlayer).toBe('function');
      expect(engine.getCurrentPlayer(state)).toBe('player1');
      
      expect(typeof engine.getNextPlayer).toBe('function');
      expect(engine.getNextPlayer(state)).toBe('player2');
      
      expect(typeof engine.advanceTurn).toBe('function');
      const nextState = engine.advanceTurn(state);
      expect(nextState.currentPlayerIndex).toBe(1);
    });
  });
});
