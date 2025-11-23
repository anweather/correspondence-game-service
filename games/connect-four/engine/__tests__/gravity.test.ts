/**
 * Tests for Connect Four gravity mechanics
 * Feature: connect-four, Property 9: Gravity places discs at lowest position
 * Validates: Requirements 3.1
 */

import { findLowestEmptyRow, applyGravity } from '../gravity';
import { CellState, PlayerColor } from '../../shared/types';
import { ROWS, COLUMNS } from '../../shared/constants';
import * as fc from 'fast-check';

describe('Gravity Mechanics', () => {
  describe('findLowestEmptyRow', () => {
    it('should return bottom row (5) for empty column', () => {
      const board: CellState[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLUMNS }, () => null)
      );

      const result = findLowestEmptyRow(board, 0);
      expect(result).toBe(5); // Bottom row
    });

    it('should return row above existing disc', () => {
      const board: CellState[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLUMNS }, () => null)
      );
      // Place a disc at bottom of column 3
      board[5][3] = 'red';

      const result = findLowestEmptyRow(board, 3);
      expect(result).toBe(4); // Row above the existing disc
    });

    it('should return null for full column', () => {
      const board: CellState[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLUMNS }, () => null)
      );
      // Fill column 2 completely
      for (let row = 0; row < ROWS; row++) {
        board[row][2] = 'yellow';
      }

      const result = findLowestEmptyRow(board, 2);
      expect(result).toBeNull();
    });

    it('should handle partially filled column', () => {
      const board: CellState[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLUMNS }, () => null)
      );
      // Fill bottom 3 rows of column 4
      board[5][4] = 'red';
      board[4][4] = 'yellow';
      board[3][4] = 'red';

      const result = findLowestEmptyRow(board, 4);
      expect(result).toBe(2); // First empty row from bottom
    });
  });

  describe('Property 9: Gravity places discs at lowest position', () => {
    it('should place disc at bottom of empty column', () => {
      // Feature: connect-four, Property 9: Gravity places discs at lowest position
      // Validates: Requirements 3.1
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: COLUMNS - 1 }), // Random column
          fc.constantFrom<PlayerColor>('red', 'yellow'), // Random color
          (column, color) => {
            const board: CellState[][] = Array.from({ length: ROWS }, () =>
              Array.from({ length: COLUMNS }, () => null)
            );

            const result = applyGravity(board, column, color);

            // Disc should be at bottom row
            expect(result.row).toBe(5);
            expect(result.board[5][column]).toBe(color);
            // All other cells should be null
            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLUMNS; c++) {
                if (r === 5 && c === column) continue;
                expect(result.board[r][c]).toBeNull();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should place disc on top of existing discs', () => {
      // Feature: connect-four, Property 9: Gravity places discs at lowest position
      // Validates: Requirements 3.1
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: COLUMNS - 1 }), // Random column
          fc.integer({ min: 1, max: ROWS - 1 }), // Number of existing discs (1 to 5)
          fc.constantFrom<PlayerColor>('red', 'yellow'), // Color for new disc
          (column, numExisting, newColor) => {
            const board: CellState[][] = Array.from({ length: ROWS }, () =>
              Array.from({ length: COLUMNS }, () => null)
            );

            // Fill bottom numExisting rows of the column
            for (let i = 0; i < numExisting; i++) {
              const row = ROWS - 1 - i;
              board[row][column] = i % 2 === 0 ? 'red' : 'yellow';
            }

            const result = applyGravity(board, column, newColor);

            // New disc should be at row (ROWS - 1 - numExisting)
            const expectedRow = ROWS - 1 - numExisting;
            expect(result.row).toBe(expectedRow);
            expect(result.board[expectedRow][column]).toBe(newColor);

            // Existing discs should remain unchanged
            for (let i = 0; i < numExisting; i++) {
              const row = ROWS - 1 - i;
              expect(result.board[row][column]).not.toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should scan from bottom to top to find empty cell', () => {
      // Feature: connect-four, Property 9: Gravity places discs at lowest position
      // Validates: Requirements 3.1
      const board: CellState[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLUMNS }, () => null)
      );

      // Create a gap in the middle (this shouldn't happen in real game, but tests the scanning)
      board[5][0] = 'red';
      board[4][0] = 'yellow';
      // Row 3 is empty
      board[2][0] = 'red';

      const result = applyGravity(board, 0, 'yellow');

      // Should find the lowest empty row (3)
      expect(result.row).toBe(3);
      expect(result.board[3][0]).toBe('yellow');
    });
  });

  describe('Property 10: Disc placement updates board correctly', () => {
    it('should update board with correct color at correct position', () => {
      // Feature: connect-four, Property 10: Disc placement updates board correctly
      // Validates: Requirements 3.4
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: COLUMNS - 1 }), // Random column
          fc.constantFrom<PlayerColor>('red', 'yellow'), // Random color
          (column, color) => {
            const board: CellState[][] = Array.from({ length: ROWS }, () =>
              Array.from({ length: COLUMNS }, () => null)
            );

            const result = applyGravity(board, column, color);

            // Board should have the disc at the returned position
            expect(result.board[result.row][column]).toBe(color);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should leave other positions unchanged', () => {
      // Feature: connect-four, Property 10: Disc placement updates board correctly
      // Validates: Requirements 3.4
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: COLUMNS - 1 }), // Random column
          fc.constantFrom<PlayerColor>('red', 'yellow'), // Random color
          (column, color) => {
            const board: CellState[][] = Array.from({ length: ROWS }, () =>
              Array.from({ length: COLUMNS }, () => null)
            );

            // Place some existing discs in other columns
            board[5][0] = 'red';
            board[5][1] = 'yellow';
            if (column !== 6) {
              board[4][6] = 'red';
            }

            const originalBoard = board.map(row => [...row]);
            const result = applyGravity(board, column, color);

            // Check that all positions except the new disc are unchanged
            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLUMNS; c++) {
                if (r === result.row && c === column) {
                  // This is the new disc position
                  expect(result.board[r][c]).toBe(color);
                } else {
                  // All other positions should match original
                  expect(result.board[r][c]).toBe(originalBoard[r][c]);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original board', () => {
      // Feature: connect-four, Property 10: Disc placement updates board correctly
      // Validates: Requirements 3.4
      const board: CellState[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLUMNS }, () => null)
      );

      const originalBoard = board.map(row => [...row]);
      applyGravity(board, 3, 'red');

      // Original board should be unchanged
      expect(board).toEqual(originalBoard);
    });
  });
});
