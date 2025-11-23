/**
 * Tests for Connect Four initialization module
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import * as fc from 'fast-check';
import {
  createEmptyBoard,
  assignPlayerColors,
  initializeGame,
} from '../initialization';
import { ROWS, COLUMNS } from '../../shared/constants';
import { Player } from '../../../../src/domain/models';
import { GameLifecycle } from '../../../../src/domain/models';

describe('ConnectFour Initialization', () => {
  describe('createEmptyBoard', () => {
    // Feature: connect-four, Property 1: Board initialization creates correct structure
    // Validates: Requirements 1.1
    it('should create a board with 6 rows and 7 columns', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const board = createEmptyBoard();

          // Board should have exactly 6 rows
          expect(board).toHaveLength(ROWS);

          // Each row should have exactly 7 columns
          board.forEach((row) => {
            expect(row).toHaveLength(COLUMNS);
          });
        }),
        { numRuns: 100 }
      );
    });

    // Feature: connect-four, Property 1: Board initialization creates correct structure
    // Validates: Requirements 1.1
    it('should initialize all cells as empty (null)', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const board = createEmptyBoard();

          // All cells should be null
          board.forEach((row) => {
            row.forEach((cell) => {
              expect(cell).toBeNull();
            });
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('assignPlayerColors', () => {
    // Feature: connect-four, Property 2: Player color assignment is deterministic
    // Validates: Requirements 1.2
    it('should assign red to first player and yellow to second player', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (playerId1, playerId2) => {
            // Ensure unique player IDs
            fc.pre(playerId1 !== playerId2);

            const players: Player[] = [
              {
                id: playerId1,
                name: 'Player 1',
                joinedAt: new Date(),
              },
              {
                id: playerId2,
                name: 'Player 2',
                joinedAt: new Date(),
              },
            ];

            const colorMap = assignPlayerColors(players);

            // First player should be red
            expect(colorMap.get(playerId1)).toBe('red');
            // Second player should be yellow
            expect(colorMap.get(playerId2)).toBe('yellow');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('initializeGame', () => {
    // Feature: connect-four, Property 3: First player starts
    // Validates: Requirements 1.3
    it('should set first player as active player', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (playerId1, playerId2, gameId) => {
            // Ensure unique player IDs
            fc.pre(playerId1 !== playerId2);

            const players: Player[] = [
              {
                id: playerId1,
                name: 'Player 1',
                joinedAt: new Date(),
              },
              {
                id: playerId2,
                name: 'Player 2',
                joinedAt: new Date(),
              },
            ];

            const gameState = initializeGame(gameId, players);

            // Current player index should be 0 (first player)
            expect(gameState.currentPlayerIndex).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: connect-four, Property 4: Games start in progress
    // Validates: Requirements 1.4
    it('should set game lifecycle to ACTIVE', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (playerId1, playerId2, gameId) => {
            // Ensure unique player IDs
            fc.pre(playerId1 !== playerId2);

            const players: Player[] = [
              {
                id: playerId1,
                name: 'Player 1',
                joinedAt: new Date(),
              },
              {
                id: playerId2,
                name: 'Player 2',
                joinedAt: new Date(),
              },
            ];

            const gameState = initializeGame(gameId, players);

            // Game should be in ACTIVE lifecycle
            expect(gameState.lifecycle).toBe(GameLifecycle.ACTIVE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow initialization with fewer than 2 players (for CREATED/WAITING state)', () => {
      const singlePlayer: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          joinedAt: new Date(),
        },
      ];

      const state = initializeGame('game1', singlePlayer);
      expect(state).toBeDefined();
      expect(state.players).toHaveLength(1);
    });

    it('should allow initialization with empty player list (for CREATED state)', () => {
      const state = initializeGame('game1', []);
      expect(state).toBeDefined();
      expect(state.players).toHaveLength(0);
    });
  });
});
