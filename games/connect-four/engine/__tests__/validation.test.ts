/**
 * Connect Four validation module tests
 * Tests move validation logic including turn validation, column validation, and error messages
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { GameState, Player } from '../../../../src/domain/models';
import { ConnectFourMetadata, ConnectFourMove, CellState } from '../../shared/types';
import { initializeGame } from '../initialization';
import {
  validateMove,
  isValidColumn,
  isColumnFull,
  isPlayerTurn,
} from '../validation';
import * as fc from 'fast-check';

describe('Validation Module', () => {
  let testPlayers: Player[];
  let baseGameState: GameState<ConnectFourMetadata>;

  beforeEach(() => {
    testPlayers = [
      { id: 'player-1', name: 'Alice', joinedAt: new Date() },
      { id: 'player-2', name: 'Bob', joinedAt: new Date() },
    ];

    // Initialize a fresh game state for each test
    baseGameState = initializeGame('test-game', testPlayers);
  });

  describe('5.1 Turn Validation - Property 5: Wrong turn moves are rejected', () => {
    // Feature: connect-four, Property 5: Wrong turn moves are rejected
    it('should reject moves by the wrong player', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }), // Valid column
          (column) => {
            const move: ConnectFourMove = {
              playerId: 'player-2', // Wrong player (player-1 should go first)
              timestamp: new Date(),
              action: 'drop',
              parameters: { column },
            };

            const result = validateMove(baseGameState, 'player-2', move);
            
            // Property: Wrong turn moves should always be rejected
            return result.valid === false && result.error !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept moves by the current player', () => {
      const move: ConnectFourMove = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'drop',
        parameters: { column: 3 },
      };

      const result = validateMove(baseGameState, 'player-1', move);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject moves when it is player 2 turn but player 1 tries to move', () => {
      const stateWithPlayer2Turn = {
        ...baseGameState,
        currentPlayerIndex: 1,
      };

      const move: ConnectFourMove = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'drop',
        parameters: { column: 3 },
      };

      const result = validateMove(stateWithPlayer2Turn, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
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

  describe('5.2 Column Validation - Property 6: Full column moves are rejected', () => {
    describe('isValidColumn', () => {
      it('should return true for valid columns (0-6)', () => {
        for (let col = 0; col <= 6; col++) {
          expect(isValidColumn(col)).toBe(true);
        }
      });

      it('should return false for negative column numbers', () => {
        expect(isValidColumn(-1)).toBe(false);
        expect(isValidColumn(-5)).toBe(false);
        expect(isValidColumn(-100)).toBe(false);
      });

      it('should return false for column >= 7', () => {
        expect(isValidColumn(7)).toBe(false);
        expect(isValidColumn(8)).toBe(false);
        expect(isValidColumn(100)).toBe(false);
      });
    });

    describe('isColumnFull', () => {
      it('should return false for empty columns', () => {
        for (let col = 0; col <= 6; col++) {
          expect(isColumnFull(baseGameState.metadata.board, col)).toBe(false);
        }
      });

      it('should return true for completely filled column', () => {
        // Create a board with column 3 completely filled
        const fullColumnBoard: CellState[][] = baseGameState.metadata.board.map((row) =>
          row.map((cell, colIndex) => (colIndex === 3 ? 'red' : cell))
        );

        expect(isColumnFull(fullColumnBoard, 3)).toBe(true);
      });

      it('should return false for partially filled column', () => {
        // Create a board with column 3 partially filled (only bottom 3 rows)
        const partialColumnBoard: CellState[][] = baseGameState.metadata.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (colIndex === 3 && rowIndex >= 3 ? 'red' : cell))
        );

        expect(isColumnFull(partialColumnBoard, 3)).toBe(false);
      });
    });

    // Feature: connect-four, Property 6: Full column moves are rejected
    it('should reject moves to full columns', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }), // Column to fill
          (column) => {
            // Create a board with the specified column completely filled
            const fullColumnBoard: CellState[][] = baseGameState.metadata.board.map((row) =>
              row.map((cell, colIndex) => (colIndex === column ? 'red' : cell))
            );

            const stateWithFullColumn = {
              ...baseGameState,
              metadata: {
                ...baseGameState.metadata,
                board: fullColumnBoard,
              },
            };

            const move: ConnectFourMove = {
              playerId: 'player-1',
              timestamp: new Date(),
              action: 'drop',
              parameters: { column },
            };

            const result = validateMove(stateWithFullColumn, 'player-1', move);
            
            // Property: Full column moves should always be rejected
            return result.valid === false && result.error !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept moves to valid non-full columns', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }), // Valid column
          (column) => {
            const move: ConnectFourMove = {
              playerId: 'player-1',
              timestamp: new Date(),
              action: 'drop',
              parameters: { column },
            };

            const result = validateMove(baseGameState, 'player-1', move);
            
            // Property: Valid columns on empty board should be accepted
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject moves with negative column numbers', () => {
      const move: ConnectFourMove = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'drop',
        parameters: { column: -1 },
      };

      const result = validateMove(baseGameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject moves with column >= 7', () => {
      const move: ConnectFourMove = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'drop',
        parameters: { column: 7 },
      };

      const result = validateMove(baseGameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('5.3 Validation Responses - Properties 7 & 8', () => {
    // Feature: connect-four, Property 7: Invalid moves return descriptive errors
    describe('Property 7: Invalid moves return descriptive errors', () => {
      it('should return descriptive error for wrong turn', () => {
        const move: ConnectFourMove = {
          playerId: 'player-2',
          timestamp: new Date(),
          action: 'drop',
          parameters: { column: 3 },
        };

        const result = validateMove(baseGameState, 'player-2', move);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('turn');
      });

      it('should return descriptive error for invalid column (negative)', () => {
        const move: ConnectFourMove = {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'drop',
          parameters: { column: -1 },
        };

        const result = validateMove(baseGameState, 'player-1', move);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.toLowerCase()).toContain('column');
      });

      it('should return descriptive error for invalid column (>= 7)', () => {
        const move: ConnectFourMove = {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'drop',
          parameters: { column: 7 },
        };

        const result = validateMove(baseGameState, 'player-1', move);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.toLowerCase()).toContain('column');
      });

      it('should return descriptive error for full column', () => {
        // Create a board with column 3 completely filled
        const fullColumnBoard: CellState[][] = baseGameState.metadata.board.map((row) =>
          row.map((cell, colIndex) => (colIndex === 3 ? 'red' : cell))
        );

        const stateWithFullColumn = {
          ...baseGameState,
          metadata: {
            ...baseGameState.metadata,
            board: fullColumnBoard,
          },
        };

        const move: ConnectFourMove = {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'drop',
          parameters: { column: 3 },
        };

        const result = validateMove(stateWithFullColumn, 'player-1', move);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('full');
      });

      it('should provide descriptive errors across all invalid scenarios', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.constant({ type: 'wrong-turn', playerId: 'player-2', column: 3 }),
              fc.constant({ type: 'negative-column', playerId: 'player-1', column: -1 }),
              fc.constant({ type: 'large-column', playerId: 'player-1', column: 7 })
            ),
            (scenario) => {
              const move: ConnectFourMove = {
                playerId: scenario.playerId,
                timestamp: new Date(),
                action: 'drop',
                parameters: { column: scenario.column },
              };

              const result = validateMove(baseGameState, scenario.playerId, move);
              
              // Property: All invalid moves should have descriptive error messages
              return (
                result.valid === false &&
                result.error !== undefined &&
                result.error.length > 0
              );
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    // Feature: connect-four, Property 8: Valid moves pass validation
    describe('Property 8: Valid moves pass validation', () => {
      it('should return success for valid moves', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 6 }), // Valid column
            (column) => {
              const move: ConnectFourMove = {
                playerId: 'player-1',
                timestamp: new Date(),
                action: 'drop',
                parameters: { column },
              };

              const result = validateMove(baseGameState, 'player-1', move);
              
              // Property: All valid moves should pass validation
              return result.valid === true && result.error === undefined;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should validate all columns on empty board', () => {
        for (let col = 0; col <= 6; col++) {
          const move: ConnectFourMove = {
            playerId: 'player-1',
            timestamp: new Date(),
            action: 'drop',
            parameters: { column: col },
          };

          const result = validateMove(baseGameState, 'player-1', move);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      });

      it('should validate moves to partially filled columns', () => {
        // Create a board with column 3 partially filled (only bottom 3 rows)
        const partialColumnBoard: CellState[][] = baseGameState.metadata.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (colIndex === 3 && rowIndex >= 3 ? 'red' : cell))
        );

        const stateWithPartialColumn = {
          ...baseGameState,
          metadata: {
            ...baseGameState.metadata,
            board: partialColumnBoard,
          },
        };

        const move: ConnectFourMove = {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'drop',
          parameters: { column: 3 },
        };

        const result = validateMove(stateWithPartialColumn, 'player-1', move);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });
});
