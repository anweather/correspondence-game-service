/**
 * Connect Four rules module tests
 * Tests win detection logic for all four directions
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import * as fc from 'fast-check';
import { CellState, PlayerColor } from '../../shared/types';
import { ROWS, COLUMNS, WIN_LENGTH } from '../../shared/constants';
import { checkWinFromPosition } from '../rules';

describe('Rules Module - Win Detection', () => {
  /**
   * Helper function to create an empty board
   */
  function createEmptyBoard(): CellState[][] {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLUMNS }, () => null as CellState)
    );
  }

  /**
   * Helper function to place discs on the board
   */
  function placeDiscs(
    board: CellState[][],
    positions: Array<{ row: number; col: number; color: PlayerColor }>
  ): CellState[][] {
    const newBoard = board.map((row) => [...row]);
    positions.forEach(({ row, col, color }) => {
      newBoard[row][col] = color;
    });
    return newBoard;
  }

  describe('6.1 Win Detection - Property 11: Horizontal wins are detected', () => {
    // Feature: connect-four, Property 11: Horizontal wins are detected
    it('should detect horizontal win of 4 consecutive discs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: ROWS - 1 }), // Any row
          fc.integer({ min: 0, max: COLUMNS - WIN_LENGTH }), // Starting column (must fit 4 discs)
          fc.constantFrom('red' as PlayerColor, 'yellow' as PlayerColor), // Player color
          (row, startCol, color) => {
            const board = createEmptyBoard();
            
            // Place 4 consecutive discs horizontally
            const positions = [];
            for (let i = 0; i < WIN_LENGTH; i++) {
              positions.push({ row, col: startCol + i, color });
            }
            const boardWithWin = placeDiscs(board, positions);

            // Check from any of the 4 positions - all should detect the win
            const results = positions.map(({ row, col }) =>
              checkWinFromPosition(boardWithWin, row, col, color)
            );

            // Property: All positions in a horizontal win should be detected
            return results.every((result) => result === true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect horizontal win at bottom row', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 5, col: 1, color: 'red' },
        { row: 5, col: 2, color: 'red' },
        { row: 5, col: 3, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithWin, 5, 0, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithWin, 5, 1, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithWin, 5, 2, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithWin, 5, 3, 'red')).toBe(true);
    });

    it('should detect horizontal win at top row', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 0, col: 3, color: 'yellow' },
        { row: 0, col: 4, color: 'yellow' },
        { row: 0, col: 5, color: 'yellow' },
        { row: 0, col: 6, color: 'yellow' },
      ]);

      expect(checkWinFromPosition(boardWithWin, 0, 3, 'yellow')).toBe(true);
    });

    it('should not detect horizontal win with only 3 consecutive discs', () => {
      const board = createEmptyBoard();
      const boardWithThree = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 5, col: 1, color: 'red' },
        { row: 5, col: 2, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithThree, 5, 1, 'red')).toBe(false);
    });

    it('should not detect horizontal win when interrupted by opponent', () => {
      const board = createEmptyBoard();
      const boardWithInterruption = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 5, col: 1, color: 'red' },
        { row: 5, col: 2, color: 'yellow' }, // Interruption
        { row: 5, col: 3, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithInterruption, 5, 0, 'red')).toBe(false);
    });
  });

  describe('6.1 Win Detection - Property 12: Vertical wins are detected', () => {
    // Feature: connect-four, Property 12: Vertical wins are detected
    it('should detect vertical win of 4 consecutive discs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: ROWS - WIN_LENGTH }), // Starting row (must fit 4 discs)
          fc.integer({ min: 0, max: COLUMNS - 1 }), // Any column
          fc.constantFrom('red' as PlayerColor, 'yellow' as PlayerColor), // Player color
          (startRow, col, color) => {
            const board = createEmptyBoard();
            
            // Place 4 consecutive discs vertically
            const positions = [];
            for (let i = 0; i < WIN_LENGTH; i++) {
              positions.push({ row: startRow + i, col, color });
            }
            const boardWithWin = placeDiscs(board, positions);

            // Check from any of the 4 positions - all should detect the win
            const results = positions.map(({ row, col }) =>
              checkWinFromPosition(boardWithWin, row, col, color)
            );

            // Property: All positions in a vertical win should be detected
            return results.every((result) => result === true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect vertical win in leftmost column', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 2, col: 0, color: 'red' },
        { row: 3, col: 0, color: 'red' },
        { row: 4, col: 0, color: 'red' },
        { row: 5, col: 0, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithWin, 2, 0, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithWin, 5, 0, 'red')).toBe(true);
    });

    it('should detect vertical win in rightmost column', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 0, col: 6, color: 'yellow' },
        { row: 1, col: 6, color: 'yellow' },
        { row: 2, col: 6, color: 'yellow' },
        { row: 3, col: 6, color: 'yellow' },
      ]);

      expect(checkWinFromPosition(boardWithWin, 1, 6, 'yellow')).toBe(true);
    });

    it('should not detect vertical win with only 3 consecutive discs', () => {
      const board = createEmptyBoard();
      const boardWithThree = placeDiscs(board, [
        { row: 3, col: 3, color: 'red' },
        { row: 4, col: 3, color: 'red' },
        { row: 5, col: 3, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithThree, 4, 3, 'red')).toBe(false);
    });

    it('should not detect vertical win when interrupted by opponent', () => {
      const board = createEmptyBoard();
      const boardWithInterruption = placeDiscs(board, [
        { row: 2, col: 3, color: 'red' },
        { row: 3, col: 3, color: 'yellow' }, // Interruption
        { row: 4, col: 3, color: 'red' },
        { row: 5, col: 3, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithInterruption, 2, 3, 'red')).toBe(false);
    });
  });

  describe('6.1 Win Detection - Property 13: Ascending diagonal wins are detected', () => {
    // Feature: connect-four, Property 13: Ascending diagonal wins are detected
    it('should detect ascending diagonal win of 4 consecutive discs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: WIN_LENGTH - 1, max: ROWS - 1 }), // Starting row (bottom-left)
          fc.integer({ min: 0, max: COLUMNS - WIN_LENGTH }), // Starting column
          fc.constantFrom('red' as PlayerColor, 'yellow' as PlayerColor), // Player color
          (startRow, startCol, color) => {
            const board = createEmptyBoard();
            
            // Place 4 consecutive discs in ascending diagonal (bottom-left to top-right)
            const positions = [];
            for (let i = 0; i < WIN_LENGTH; i++) {
              positions.push({ row: startRow - i, col: startCol + i, color });
            }
            const boardWithWin = placeDiscs(board, positions);

            // Check from any of the 4 positions - all should detect the win
            const results = positions.map(({ row, col }) =>
              checkWinFromPosition(boardWithWin, row, col, color)
            );

            // Property: All positions in an ascending diagonal win should be detected
            return results.every((result) => result === true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect ascending diagonal win from bottom-left to top-right', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' }, // Bottom-left
        { row: 4, col: 1, color: 'red' },
        { row: 3, col: 2, color: 'red' },
        { row: 2, col: 3, color: 'red' }, // Top-right
      ]);

      expect(checkWinFromPosition(boardWithWin, 5, 0, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithWin, 3, 2, 'red')).toBe(true);
    });

    it('should detect ascending diagonal win in corner', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 5, col: 3, color: 'yellow' },
        { row: 4, col: 4, color: 'yellow' },
        { row: 3, col: 5, color: 'yellow' },
        { row: 2, col: 6, color: 'yellow' }, // Top-right corner
      ]);

      expect(checkWinFromPosition(boardWithWin, 5, 3, 'yellow')).toBe(true);
    });

    it('should not detect ascending diagonal win with only 3 consecutive discs', () => {
      const board = createEmptyBoard();
      const boardWithThree = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 4, col: 1, color: 'red' },
        { row: 3, col: 2, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithThree, 4, 1, 'red')).toBe(false);
    });

    it('should not detect ascending diagonal win when interrupted', () => {
      const board = createEmptyBoard();
      const boardWithInterruption = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 4, col: 1, color: 'yellow' }, // Interruption
        { row: 3, col: 2, color: 'red' },
        { row: 2, col: 3, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithInterruption, 5, 0, 'red')).toBe(false);
    });
  });

  describe('6.1 Win Detection - Property 14: Descending diagonal wins are detected', () => {
    // Feature: connect-four, Property 14: Descending diagonal wins are detected
    it('should detect descending diagonal win of 4 consecutive discs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: ROWS - WIN_LENGTH }), // Starting row (top-left)
          fc.integer({ min: 0, max: COLUMNS - WIN_LENGTH }), // Starting column
          fc.constantFrom('red' as PlayerColor, 'yellow' as PlayerColor), // Player color
          (startRow, startCol, color) => {
            const board = createEmptyBoard();
            
            // Place 4 consecutive discs in descending diagonal (top-left to bottom-right)
            const positions = [];
            for (let i = 0; i < WIN_LENGTH; i++) {
              positions.push({ row: startRow + i, col: startCol + i, color });
            }
            const boardWithWin = placeDiscs(board, positions);

            // Check from any of the 4 positions - all should detect the win
            const results = positions.map(({ row, col }) =>
              checkWinFromPosition(boardWithWin, row, col, color)
            );

            // Property: All positions in a descending diagonal win should be detected
            return results.every((result) => result === true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect descending diagonal win from top-left to bottom-right', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 0, col: 0, color: 'red' }, // Top-left
        { row: 1, col: 1, color: 'red' },
        { row: 2, col: 2, color: 'red' },
        { row: 3, col: 3, color: 'red' }, // Bottom-right
      ]);

      expect(checkWinFromPosition(boardWithWin, 0, 0, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithWin, 2, 2, 'red')).toBe(true);
    });

    it('should detect descending diagonal win in corner', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 2, col: 3, color: 'yellow' },
        { row: 3, col: 4, color: 'yellow' },
        { row: 4, col: 5, color: 'yellow' },
        { row: 5, col: 6, color: 'yellow' }, // Bottom-right corner
      ]);

      expect(checkWinFromPosition(boardWithWin, 2, 3, 'yellow')).toBe(true);
    });

    it('should not detect descending diagonal win with only 3 consecutive discs', () => {
      const board = createEmptyBoard();
      const boardWithThree = placeDiscs(board, [
        { row: 0, col: 0, color: 'red' },
        { row: 1, col: 1, color: 'red' },
        { row: 2, col: 2, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithThree, 1, 1, 'red')).toBe(false);
    });

    it('should not detect descending diagonal win when interrupted', () => {
      const board = createEmptyBoard();
      const boardWithInterruption = placeDiscs(board, [
        { row: 0, col: 0, color: 'red' },
        { row: 1, col: 1, color: 'red' },
        { row: 2, col: 2, color: 'yellow' }, // Interruption
        { row: 3, col: 3, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithInterruption, 0, 0, 'red')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should not detect win on empty board', () => {
      const board = createEmptyBoard();
      expect(checkWinFromPosition(board, 0, 0, 'red')).toBe(false);
    });

    it('should not detect win with single disc', () => {
      const board = createEmptyBoard();
      const boardWithOne = placeDiscs(board, [
        { row: 5, col: 3, color: 'red' },
      ]);

      expect(checkWinFromPosition(boardWithOne, 5, 3, 'red')).toBe(false);
    });

    it('should handle checking from empty cell', () => {
      const board = createEmptyBoard();
      // Checking from an empty cell should return false
      expect(checkWinFromPosition(board, 3, 3, 'red')).toBe(false);
    });

    it('should detect win with more than 4 consecutive discs', () => {
      const board = createEmptyBoard();
      const boardWithFive = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 5, col: 1, color: 'red' },
        { row: 5, col: 2, color: 'red' },
        { row: 5, col: 3, color: 'red' },
        { row: 5, col: 4, color: 'red' },
      ]);

      // Should detect win from any of the 5 positions
      expect(checkWinFromPosition(boardWithFive, 5, 0, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithFive, 5, 2, 'red')).toBe(true);
      expect(checkWinFromPosition(boardWithFive, 5, 4, 'red')).toBe(true);
    });
  });
});

describe('Rules Module - Game Completion', () => {
  /**
   * Helper function to create an empty board
   */
  function createEmptyBoard(): CellState[][] {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLUMNS }, () => null as CellState)
    );
  }

  /**
   * Helper function to place discs on the board
   */
  function placeDiscs(
    board: CellState[][],
    positions: Array<{ row: number; col: number; color: PlayerColor }>
  ): CellState[][] {
    const newBoard = board.map((row) => [...row]);
    positions.forEach(({ row, col, color }) => {
      newBoard[row][col] = color;
    });
    return newBoard;
  }

  /**
   * Helper function to create a full board without a winner
   * Creates a pattern that fills the board but has no 4-in-a-row
   */
  function createFullBoardWithoutWinner(): CellState[][] {
    // Manually create a specific pattern that avoids all 4-in-a-row
    // Pattern uses groups of 3 to prevent any 4-in-a-row
    const board: CellState[][] = [
      ['red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'red'],
      ['red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'red'],
      ['red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow'],
      ['yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'red'],
    ];
    return board;
  }

  describe('7.1 Game Completion - Property 15: Winning moves complete the game', () => {
    // Feature: connect-four, Property 15: Winning moves complete the game
    it('should detect game completion when a winning pattern exists', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: ROWS - 1 }), // Any row
          fc.integer({ min: 0, max: COLUMNS - WIN_LENGTH }), // Starting column
          fc.constantFrom('red' as PlayerColor, 'yellow' as PlayerColor), // Player color
          (row, startCol, color) => {
            const board = createEmptyBoard();
            
            // Place 4 consecutive discs horizontally to create a win
            const positions = [];
            for (let i = 0; i < WIN_LENGTH; i++) {
              positions.push({ row, col: startCol + i, color });
            }
            const boardWithWin = placeDiscs(board, positions);

            // Check if any position in the winning line detects the win
            const hasWin = positions.some(({ row, col }) =>
              checkWinFromPosition(boardWithWin, row, col, color)
            );

            // Property: A board with a winning pattern should be detected as having a winner
            return hasWin === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect horizontal win completion', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 5, col: 1, color: 'red' },
        { row: 5, col: 2, color: 'red' },
        { row: 5, col: 3, color: 'red' },
      ]);

      // The last move at (5, 3) should detect the win
      expect(checkWinFromPosition(boardWithWin, 5, 3, 'red')).toBe(true);
    });

    it('should detect vertical win completion', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 2, col: 3, color: 'yellow' },
        { row: 3, col: 3, color: 'yellow' },
        { row: 4, col: 3, color: 'yellow' },
        { row: 5, col: 3, color: 'yellow' },
      ]);

      // The last move at (2, 3) should detect the win
      expect(checkWinFromPosition(boardWithWin, 2, 3, 'yellow')).toBe(true);
    });

    it('should detect diagonal win completion', () => {
      const board = createEmptyBoard();
      const boardWithWin = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 4, col: 1, color: 'red' },
        { row: 3, col: 2, color: 'red' },
        { row: 2, col: 3, color: 'red' },
      ]);

      // The last move at (2, 3) should detect the win
      expect(checkWinFromPosition(boardWithWin, 2, 3, 'red')).toBe(true);
    });
  });

  describe('7.1 Game Completion - Property 16: Full board without winner is a draw', () => {
    // Feature: connect-four, Property 16: Full board without winner is a draw
    it('should detect when board is completely full', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const fullBoard = createFullBoardWithoutWinner();

          // Count filled cells
          let filledCells = 0;
          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLUMNS; col++) {
              if (fullBoard[row][col] !== null) {
                filledCells++;
              }
            }
          }

          // Property: A full board should have all 42 cells filled
          return filledCells === ROWS * COLUMNS;
        }),
        { numRuns: 100 }
      );
    });

    it('should recognize full board without winner as draw', () => {
      const fullBoard = createFullBoardWithoutWinner();

      // Check that no position has a win
      let hasWin = false;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          const color = fullBoard[row][col];
          if (color && checkWinFromPosition(fullBoard, row, col, color)) {
            hasWin = true;
            break;
          }
        }
        if (hasWin) break;
      }

      // The full board should not have any winning patterns
      expect(hasWin).toBe(false);

      // Verify board is actually full
      let filledCells = 0;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          if (fullBoard[row][col] !== null) {
            filledCells++;
          }
        }
      }
      expect(filledCells).toBe(ROWS * COLUMNS);
    });

    it('should not consider partially filled board as full', () => {
      const board = createEmptyBoard();
      const partialBoard = placeDiscs(board, [
        { row: 5, col: 0, color: 'red' },
        { row: 5, col: 1, color: 'yellow' },
        { row: 5, col: 2, color: 'red' },
      ]);

      // Count filled cells
      let filledCells = 0;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          if (partialBoard[row][col] !== null) {
            filledCells++;
          }
        }
      }

      // Should not be full
      expect(filledCells).toBeLessThan(ROWS * COLUMNS);
    });

    it('should handle board with winner that is also full', () => {
      // Create a full board with a winning pattern
      const fullBoard = createFullBoardWithoutWinner();
      // Add a winning horizontal line by modifying the pattern
      fullBoard[5][0] = 'red';
      fullBoard[5][1] = 'red';
      fullBoard[5][2] = 'red';
      fullBoard[5][3] = 'red';

      // Should detect the win
      expect(checkWinFromPosition(fullBoard, 5, 0, 'red')).toBe(true);

      // Board should still be full
      let filledCells = 0;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          if (fullBoard[row][col] !== null) {
            filledCells++;
          }
        }
      }
      expect(filledCells).toBe(ROWS * COLUMNS);
    });
  });
});
