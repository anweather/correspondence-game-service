/**
 * Connect Four move application tests
 * Tests move application, turn management, and immutability
 * Requirements: 6.1, 6.2, 6.3, 9.1, 9.3
 */

import * as fc from 'fast-check';
import { Player, GameLifecycle } from '../../../../src/domain/models';
import { ConnectFourMove } from '../../shared/types';
import { ROWS, COLUMNS } from '../../shared/constants';
import { initializeGame } from '../initialization';
import { applyMove } from '../rules';

describe('Move Application Module', () => {
  /**
   * Helper function to create test players
   */
  function createTestPlayers(): Player[] {
    return [
      {
        id: 'player1',
        name: 'Player 1',
        joinedAt: new Date(),
      },
      {
        id: 'player2',
        name: 'Player 2',
        joinedAt: new Date(),
      },
    ];
  }

  /**
   * Helper function to create a move
   */
  function createMove(column: number, playerId: string): ConnectFourMove {
    return {
      playerId,
      timestamp: new Date(),
      action: 'drop',
      parameters: { column },
    };
  }



  describe('8.1 Move Application - Property 17: Valid moves alternate turns', () => {
    // Feature: connect-four, Property 17: Valid moves alternate turns
    it('should alternate turns after each valid move', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: COLUMNS - 1 }), // First move column
          fc.integer({ min: 0, max: COLUMNS - 1 }), // Second move column
          (col1, col2) => {
            const players = createTestPlayers();
            const gameState = initializeGame('test-game', players);

            // Initial state: player 1's turn (index 0)
            const initialPlayerIndex = gameState.currentPlayerIndex;
            expect(initialPlayerIndex).toBe(0);

            // Apply first move by player 1
            const move1 = createMove(col1, players[0].id);
            const stateAfterMove1 = applyMove(gameState, move1);

            // After first move, should be player 2's turn (index 1)
            const playerIndexAfterMove1 = stateAfterMove1.currentPlayerIndex;

            // If game is not completed, turn should have switched
            if (stateAfterMove1.lifecycle !== GameLifecycle.COMPLETED) {
              if (playerIndexAfterMove1 !== 1) {
                return false;
              }

              // Apply second move by player 2
              const move2 = createMove(col2, players[1].id);
              const stateAfterMove2 = applyMove(stateAfterMove1, move2);

              // After second move, should be back to player 1's turn (index 0)
              const playerIndexAfterMove2 = stateAfterMove2.currentPlayerIndex;

              // If game is not completed, turn should have switched back
              if (stateAfterMove2.lifecycle !== GameLifecycle.COMPLETED) {
                return playerIndexAfterMove2 === 0;
              }
            }

            // Property holds if we reach here
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should switch from player 1 to player 2 after first move', () => {
      const players = createTestPlayers();
      const gameState = initializeGame('test-game', players);

      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.players[gameState.currentPlayerIndex].id).toBe('player1');

      const move = createMove(3, 'player1');
      const newState = applyMove(gameState, move);

      expect(newState.currentPlayerIndex).toBe(1);
      expect(newState.players[newState.currentPlayerIndex].id).toBe('player2');
    });

    it('should switch from player 2 to player 1 after second move', () => {
      const players = createTestPlayers();
      let gameState = initializeGame('test-game', players);

      // First move by player 1
      const move1 = createMove(3, 'player1');
      gameState = applyMove(gameState, move1);

      expect(gameState.currentPlayerIndex).toBe(1);

      // Second move by player 2
      const move2 = createMove(3, 'player2');
      const newState = applyMove(gameState, move2);

      expect(newState.currentPlayerIndex).toBe(0);
      expect(newState.players[newState.currentPlayerIndex].id).toBe('player1');
    });

    it('should continue alternating turns through multiple moves', () => {
      const players = createTestPlayers();
      let gameState = initializeGame('test-game', players);

      // Play 6 moves in column 0 (filling it)
      for (let i = 0; i < 6; i++) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const move = createMove(0, currentPlayer.id);
        gameState = applyMove(gameState, move);

        // After each move, turn should alternate (unless game is completed)
        if (gameState.lifecycle !== GameLifecycle.COMPLETED) {
          const expectedIndex = (i + 1) % 2;
          expect(gameState.currentPlayerIndex).toBe(expectedIndex);
        }
      }
    });
  });

  describe('8.1 Move Application - Property 18: Completed games don\'t change turns', () => {
    // Feature: connect-four, Property 18: Completed games don't change turns
    it('should not change turn when game is already completed', () => {
      const players = createTestPlayers();
      let gameState = initializeGame('test-game', players);

      // Create a winning position for player 1 (red)
      // Place 3 red discs in a row, then complete the win
      gameState = applyMove(gameState, createMove(0, 'player1')); // Red at (5,0)
      gameState = applyMove(gameState, createMove(0, 'player2')); // Yellow at (4,0)
      gameState = applyMove(gameState, createMove(1, 'player1')); // Red at (5,1)
      gameState = applyMove(gameState, createMove(1, 'player2')); // Yellow at (4,1)
      gameState = applyMove(gameState, createMove(2, 'player1')); // Red at (5,2)
      gameState = applyMove(gameState, createMove(2, 'player2')); // Yellow at (4,2)
      gameState = applyMove(gameState, createMove(3, 'player1')); // Red at (5,3) - WINS!

      // Game should be completed
      expect(gameState.lifecycle).toBe(GameLifecycle.COMPLETED);

      // Try to make another move (should be rejected)
      const move = createMove(4, gameState.players[gameState.currentPlayerIndex].id);

      // Should throw an error for completed game
      expect(() => {
        applyMove(gameState, move);
      }).toThrow('Game is already completed');
    });
  });

  describe('8.1 Move Application - Property 19: Game state indicates current turn', () => {
    // Feature: connect-four, Property 19: Game state indicates current turn
    it('should always indicate which player\'s turn it is', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: COLUMNS - 1 }), { minLength: 1, maxLength: 10 }),
          (columns) => {
            const players = createTestPlayers();
            let gameState = initializeGame('test-game', players);

            // For every state, we should be able to determine whose turn it is
            for (const column of columns) {
              // Check that currentPlayerIndex is valid
              const currentPlayerIndex = gameState.currentPlayerIndex;
              if (currentPlayerIndex < 0 || currentPlayerIndex >= gameState.players.length) {
                return false;
              }

              // Check that we can get the current player
              const currentPlayer = gameState.players[currentPlayerIndex];
              if (!currentPlayer || !currentPlayer.id) {
                return false;
              }

              // If game is completed, we can still determine the turn (even if moves aren't allowed)
              if (gameState.lifecycle === GameLifecycle.COMPLETED) {
                break;
              }

              // Apply move
              const move = createMove(column, currentPlayer.id);
              try {
                gameState = applyMove(gameState, move);
              } catch (_error) {
                // If move fails (e.g., column full), that's okay - we still had a valid turn indicator
                break;
              }
            }

            // Property: We should always be able to determine whose turn it is
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have valid currentPlayerIndex at initialization', () => {
      const players = createTestPlayers();
      const gameState = initializeGame('test-game', players);

      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.currentPlayerIndex).toBeGreaterThanOrEqual(0);
      expect(gameState.currentPlayerIndex).toBeLessThan(gameState.players.length);
    });

    it('should have valid currentPlayerIndex after each move', () => {
      const players = createTestPlayers();
      let gameState = initializeGame('test-game', players);

      for (let i = 0; i < 10; i++) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const move = createMove(i % COLUMNS, currentPlayer.id);

        try {
          gameState = applyMove(gameState, move);

          // currentPlayerIndex should always be valid
          expect(gameState.currentPlayerIndex).toBeGreaterThanOrEqual(0);
          expect(gameState.currentPlayerIndex).toBeLessThan(gameState.players.length);

          // Should be able to get the current player
          const nextPlayer = gameState.players[gameState.currentPlayerIndex];
          expect(nextPlayer).toBeDefined();
          expect(nextPlayer.id).toBeDefined();
        } catch (error) {
          // If move fails, that's okay
          break;
        }

        if (gameState.lifecycle === GameLifecycle.COMPLETED) {
          break;
        }
      }
    });
  });

  describe('8.2 Immutability - Property 28: Move application is immutable', () => {
    // Feature: connect-four, Property 28: Move application is immutable
    it('should not modify original game state when applying move', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: COLUMNS - 1 }),
          (column) => {
            const players = createTestPlayers();
            const originalState = initializeGame('test-game', players);

            // Deep clone the original state for comparison
            const originalStateCopy = JSON.parse(JSON.stringify(originalState));

            // Apply move
            const move = createMove(column, players[0].id);
            applyMove(originalState, move);

            // Original state should be unchanged
            const originalStateAfter = JSON.parse(JSON.stringify(originalState));

            // Property: Original state should match its copy (unchanged)
            return JSON.stringify(originalStateCopy) === JSON.stringify(originalStateAfter);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create new board array when applying move', () => {
      const players = createTestPlayers();
      const originalState = initializeGame('test-game', players);
      const originalBoard = originalState.metadata.board;

      const move = createMove(3, 'player1');
      const newState = applyMove(originalState, move);
      const newBoard = newState.metadata.board;

      // Boards should be different array references
      expect(newBoard).not.toBe(originalBoard);

      // Original board should be unchanged
      expect(originalBoard[5][3]).toBeNull();

      // New board should have the disc
      expect(newBoard[5][3]).toBe('red');
    });

    it('should not modify original board rows', () => {
      const players = createTestPlayers();
      const originalState = initializeGame('test-game', players);
      const originalRow = originalState.metadata.board[5];

      const move = createMove(3, 'player1');
      const newState = applyMove(originalState, move);

      // Row arrays should be different references
      expect(newState.metadata.board[5]).not.toBe(originalRow);

      // Original row should be unchanged
      expect(originalRow[3]).toBeNull();
    });

    it('should create new game state object', () => {
      const players = createTestPlayers();
      const originalState = initializeGame('test-game', players);

      const move = createMove(3, 'player1');
      const newState = applyMove(originalState, move);

      // States should be different objects
      expect(newState).not.toBe(originalState);

      // But should have same gameId
      expect(newState.gameId).toBe(originalState.gameId);
    });
  });

  describe('8.2 Immutability - Property 29: Invalid moves don\'t change state', () => {
    // Feature: connect-four, Property 29: Invalid moves don't change state
    it('should not change state when move is invalid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10, max: 20 }), // Include invalid column numbers
          (column) => {
            const players = createTestPlayers();
            const originalState = initializeGame('test-game', players);

            // Deep clone for comparison
            const originalStateCopy = JSON.parse(JSON.stringify(originalState));

            // Try to apply potentially invalid move
            const move = createMove(column, players[0].id);

            try {
              applyMove(originalState, move);

              // If move was accepted, state should change
              // If move was invalid, this shouldn't be reached
              if (column < 0 || column >= COLUMNS) {
                // Invalid column should not produce a new state
                return false;
              }
            } catch (error) {
              // If error thrown, original state should be unchanged
              const originalStateAfter = JSON.parse(JSON.stringify(originalState));
              return JSON.stringify(originalStateCopy) === JSON.stringify(originalStateAfter);
            }

            // Property holds
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for wrong player turn without changing state', () => {
      const players = createTestPlayers();
      const originalState = initializeGame('test-game', players);
      const originalStateCopy = JSON.parse(JSON.stringify(originalState));

      // Try to make move with wrong player (player 2 when it's player 1's turn)
      const move = createMove(3, 'player2');

      expect(() => {
        applyMove(originalState, move);
      }).toThrow();

      // Original state should be unchanged
      const originalStateAfter = JSON.parse(JSON.stringify(originalState));
      expect(originalStateCopy).toEqual(originalStateAfter);
    });

    it('should throw error for full column without changing state', () => {
      const players = createTestPlayers();
      let gameState = initializeGame('test-game', players);

      // Fill column 0 completely
      for (let i = 0; i < ROWS; i++) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const move = createMove(0, currentPlayer.id);
        gameState = applyMove(gameState, move);
      }

      // Now column 0 is full
      const fullColumnState = gameState;
      const fullColumnStateCopy = JSON.parse(JSON.stringify(fullColumnState));

      // Try to add another disc to full column
      const currentPlayer = fullColumnState.players[fullColumnState.currentPlayerIndex];
      const move = createMove(0, currentPlayer.id);

      expect(() => {
        applyMove(fullColumnState, move);
      }).toThrow();

      // Original state should be unchanged
      const fullColumnStateAfter = JSON.parse(JSON.stringify(fullColumnState));
      expect(fullColumnStateCopy).toEqual(fullColumnStateAfter);
    });

    it('should throw error for invalid column without changing state', () => {
      const players = createTestPlayers();
      const originalState = initializeGame('test-game', players);
      const originalStateCopy = JSON.parse(JSON.stringify(originalState));

      // Try invalid column numbers
      const invalidColumns = [-1, 7, 10, -5];

      for (const column of invalidColumns) {
        const move = createMove(column, 'player1');

        expect(() => {
          applyMove(originalState, move);
        }).toThrow();

        // Original state should still be unchanged
        const originalStateAfter = JSON.parse(JSON.stringify(originalState));
        expect(originalStateCopy).toEqual(originalStateAfter);
      }
    });
  });
});
