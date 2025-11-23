/**
 * Connect Four Engine Integration Tests
 * Tests the complete game flow through the main engine class
 * Requirements: 9.4, All
 */

import { ConnectFourEngine } from '../ConnectFourEngine';
import { Player, GameLifecycle } from '../../../../src/domain/models';
import { GameConfig } from '../../../../src/domain/interfaces';
import { ConnectFourMove } from '../../shared/types';

describe('ConnectFourEngine Integration Tests', () => {
  let engine: ConnectFourEngine;
  let player1: Player;
  let player2: Player;

  beforeEach(() => {
    engine = new ConnectFourEngine();
    player1 = { id: 'player1', name: 'Alice', joinedAt: new Date() };
    player2 = { id: 'player2', name: 'Bob', joinedAt: new Date() };
  });

  // Helper function to create a move with all required fields
  const createMove = (playerId: string, column: number): ConnectFourMove => ({
    action: 'drop',
    playerId,
    timestamp: new Date(),
    parameters: { column },
  });

  describe('Metadata', () => {
    it('should return correct game type', () => {
      expect(engine.getGameType()).toBe('connect-four');
    });

    it('should return correct player limits', () => {
      expect(engine.getMinPlayers()).toBe(2);
      expect(engine.getMaxPlayers()).toBe(2);
    });

    it('should return a description', () => {
      const description = engine.getDescription();
      expect(description).toBeTruthy();
      expect(typeof description).toBe('string');
    });
  });

  describe('Complete Game Flow: Init → Moves → Win', () => {
    /**
     * Feature: connect-four, Property 30: Game state is complete
     * Validates: Requirements 9.4
     * 
     * Tests that a complete game flow from initialization through moves to a win
     * maintains complete state information at each step
     */
    it('should handle complete game flow ending in a win', () => {
      const config: GameConfig = {};
      
      // Initialize game
      const initialState = engine.initializeGame([player1, player2], config);
      
      // Verify initial state completeness
      expect(initialState.gameId).toBeTruthy();
      expect(initialState.gameType).toBe('connect-four');
      expect(initialState.lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(initialState.players).toHaveLength(2);
      expect(initialState.currentPlayerIndex).toBe(0);
      expect(initialState.metadata.board).toBeDefined();
      expect(initialState.metadata.board).toHaveLength(6);
      expect(initialState.metadata.board[0]).toHaveLength(7);
      expect(initialState.moveHistory).toEqual([]);
      expect(initialState.version).toBe(0);
      
      // Play moves to create a horizontal win for player1 (red)
      // Column layout (bottom row):
      // R R R R Y Y Y
      let state = initialState;
      
      // Move 1: Player 1 drops in column 0
      const move1 = createMove(player1.id, 0);
      const validation1 = engine.validateMove(state, player1.id, move1);
      expect(validation1.valid).toBe(true);
      state = engine.applyMove(state, player1.id, move1);
      
      // Verify state after move 1
      expect(state.metadata.board[5][0]).toBe('red');
      expect(state.currentPlayerIndex).toBe(1);
      expect(state.lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(state.moveHistory).toHaveLength(1);
      expect(state.version).toBe(1);
      
      // Move 2: Player 2 drops in column 4
      const move2 = createMove(player2.id, 4);
      state = engine.applyMove(state, player2.id, move2);
      expect(state.metadata.board[5][4]).toBe('yellow');
      expect(state.currentPlayerIndex).toBe(0);
      
      // Move 3: Player 1 drops in column 1
      const move3 = createMove(player1.id, 1);
      state = engine.applyMove(state, player1.id, move3);
      expect(state.metadata.board[5][1]).toBe('red');
      
      // Move 4: Player 2 drops in column 5
      const move4 = createMove(player2.id, 5);
      state = engine.applyMove(state, player2.id, move4);
      expect(state.metadata.board[5][5]).toBe('yellow');
      
      // Move 5: Player 1 drops in column 2
      const move5 = createMove(player1.id, 2);
      state = engine.applyMove(state, player1.id, move5);
      expect(state.metadata.board[5][2]).toBe('red');
      
      // Move 6: Player 2 drops in column 6
      const move6 = createMove(player2.id, 6);
      state = engine.applyMove(state, player2.id, move6);
      expect(state.metadata.board[5][6]).toBe('yellow');
      
      // Move 7: Player 1 drops in column 3 - WINNING MOVE
      const move7 = createMove(player1.id, 3);
      state = engine.applyMove(state, player1.id, move7);
      
      // Verify final state completeness
      expect(state.metadata.board[5][3]).toBe('red');
      expect(state.lifecycle).toBe(GameLifecycle.COMPLETED);
      expect(engine.isGameOver(state)).toBe(true);
      expect(engine.getWinner(state)).toBe(player1.id);
      expect(state.moveHistory).toHaveLength(7);
      expect(state.version).toBe(7);
      expect(state.metadata.lastMove).toEqual({
        row: 5,
        column: 3,
        player: player1.id,
      });
      
      // Verify rendering works on completed game
      const renderData = engine.renderBoard(state);
      expect(renderData.viewBox).toBeDefined();
      expect(renderData.layers).toBeDefined();
      expect(renderData.layers.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Game Flow: Init → Moves → Draw', () => {
    /**
     * Feature: connect-four, Property 30: Game state is complete
     * Validates: Requirements 9.4
     * 
     * Tests that a complete game flow ending in a draw maintains complete state
     * Note: Creating a true draw in Connect Four is complex, so we test the draw
     * detection logic by manually creating a full board state without a winner
     */
    it('should detect draw when board is full without a winner', () => {
      const config: GameConfig = {};
      let state = engine.initializeGame([player1, player2], config);
      
      // Manually create a full board pattern that has no winner
      // This is a carefully crafted pattern to avoid any 4-in-a-row
      // Pattern (R=red, Y=yellow):
      // R Y R Y R Y R
      // Y R Y R Y R Y
      // R Y R Y R Y R
      // R Y R Y R Y R
      // Y R Y R Y R Y
      // Y R Y R Y R Y
      state.metadata.board = [
        ['red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red'],
        ['yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow'],
        ['red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red'],
        ['red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red'],
        ['yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow'],
        ['yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow'],
      ];
      
      // Verify this is detected as a draw
      expect(engine.isGameOver(state)).toBe(true);
      expect(engine.getWinner(state)).toBeNull();
      
      // Verify board is completely full
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
          expect(state.metadata.board[row][col]).not.toBeNull();
        }
      }
      
      // Verify rendering works on draw game
      const renderData = engine.renderBoard(state);
      expect(renderData.viewBox).toBeDefined();
      expect(renderData.layers).toBeDefined();
    });
  });

  describe('Invalid Move Handling Throughout Game', () => {
    /**
     * Feature: connect-four, Property 30: Game state is complete
     * Validates: Requirements 9.4
     * 
     * Tests that invalid moves are properly rejected and state remains complete
     */
    it('should reject invalid moves and maintain state integrity', () => {
      const config: GameConfig = {};
      let state = engine.initializeGame([player1, player2], config);
      
      // Test 1: Wrong player's turn
      const wrongTurnMove = createMove(player2.id, 0); // Player 2 tries to go first
      const validation1 = engine.validateMove(state, player2.id, wrongTurnMove);
      expect(validation1.valid).toBe(false);
      expect(validation1.reason).toContain('not your turn');
      
      // Verify state unchanged
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.moveHistory).toHaveLength(0);
      
      // Test 2: Invalid column (negative)
      const invalidColumnMove1 = createMove(player1.id, -1);
      const validation2 = engine.validateMove(state, player1.id, invalidColumnMove1);
      expect(validation2.valid).toBe(false);
      expect(validation2.reason).toContain('Column must be between 0 and 6');
      
      // Test 3: Invalid column (too high)
      const invalidColumnMove2 = createMove(player1.id, 7);
      const validation3 = engine.validateMove(state, player1.id, invalidColumnMove2);
      expect(validation3.valid).toBe(false);
      expect(validation3.reason).toContain('Column must be between 0 and 6');
      
      // Test 4: Fill a column and try to overfill
      // Fill column 0 completely (6 discs)
      for (let i = 0; i < 6; i++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const move = createMove(currentPlayer.id, 0);
        state = engine.applyMove(state, currentPlayer.id, move);
      }
      
      // Try to add to full column
      const currentPlayer = state.players[state.currentPlayerIndex];
      const fullColumnMove = createMove(currentPlayer.id, 0);
      const validation4 = engine.validateMove(state, currentPlayer.id, fullColumnMove);
      expect(validation4.valid).toBe(false);
      expect(validation4.reason).toContain('Column 0 is full');
      
      // Verify state is still complete and consistent
      expect(state.metadata.board).toBeDefined();
      expect(state.moveHistory).toHaveLength(6);
      expect(state.lifecycle).toBe(GameLifecycle.ACTIVE);
    });
  });

  describe('State Completeness at Each Step', () => {
    /**
     * Feature: connect-four, Property 30: Game state is complete
     * Validates: Requirements 9.4
     * 
     * Tests that state contains all necessary information at every step
     */
    it('should maintain complete state information throughout the game', () => {
      const config: GameConfig = {};
      let state = engine.initializeGame([player1, player2], config);
      
      // Helper to verify state completeness
      const verifyStateCompleteness = (s: typeof state) => {
        expect(s.gameId).toBeTruthy();
        expect(s.gameType).toBe('connect-four');
        expect(s.lifecycle).toBeDefined();
        expect(s.players).toHaveLength(2);
        expect(s.currentPlayerIndex).toBeGreaterThanOrEqual(0);
        expect(s.currentPlayerIndex).toBeLessThan(2);
        expect(s.phase).toBeDefined();
        expect(s.board).toBeDefined();
        expect(s.moveHistory).toBeDefined();
        expect(s.metadata).toBeDefined();
        expect(s.metadata.board).toBeDefined();
        expect(s.metadata.board).toHaveLength(6);
        expect(s.metadata.board[0]).toHaveLength(7);
        expect(s.version).toBeGreaterThanOrEqual(0);
        expect(s.createdAt).toBeInstanceOf(Date);
        expect(s.updatedAt).toBeInstanceOf(Date);
      };
      
      // Verify initial state
      verifyStateCompleteness(state);
      
      // Make several moves and verify state at each step
      const moves = [
        { player: player1, column: 3 },
        { player: player2, column: 3 },
        { player: player1, column: 4 },
        { player: player2, column: 4 },
        { player: player1, column: 2 },
      ];
      
      for (const { player, column } of moves) {
        const move = createMove(player.id, column);
        
        state = engine.applyMove(state, player.id, move);
        verifyStateCompleteness(state);
        
        // Verify lastMove is recorded
        expect(state.metadata.lastMove).toBeDefined();
        expect(state.metadata.lastMove?.column).toBe(column);
        expect(state.metadata.lastMove?.player).toBe(player.id);
      }
      
      // Verify rendering produces complete data
      const renderData = engine.renderBoard(state);
      expect(renderData.viewBox).toBeDefined();
      expect(renderData.viewBox.width).toBeGreaterThan(0);
      expect(renderData.viewBox.height).toBeGreaterThan(0);
      expect(renderData.layers).toBeDefined();
      expect(renderData.layers.length).toBeGreaterThan(0);
      
      // Verify each layer has required properties
      for (const layer of renderData.layers) {
        expect(layer.name).toBeDefined();
        expect(layer.zIndex).toBeDefined();
        expect(layer.elements).toBeDefined();
        expect(Array.isArray(layer.elements)).toBe(true);
      }
    });
  });
});
