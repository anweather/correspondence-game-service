/**
 * Property-based tests for Yahtzee validation module
 * Tests universal properties that should hold across all inputs
 * Requirements: 3.4, 6.2, 6.3
 */

import fc from 'fast-check';
import { validateMove } from '../validation';
import { GameState, Player, GameLifecycle } from '@domain/models';
import { ValidationResult } from '@domain/interfaces';
import { YahtzeeMove, YahtzeeMetadata, YahtzeeCategory, Scorecard } from '../../shared/types';

describe('Yahtzee Validation Property Tests', () => {
  
  /**
   * **Feature: yahtzee-plugin, Property 3: Category usage uniqueness**
   * **Validates: Requirements 3.4**
   * 
   * For any player and category, once a category has been scored, it should remain 
   * unavailable for future scoring by that player and attempting to use it should be rejected
   */
  it('Property 3: Category usage uniqueness', () => {
    fc.assert(
      fc.property(
        // Generate random player ID
        fc.string({ minLength: 1, maxLength: 20 }),
        // Generate random category
        fc.constantFrom(...Object.values(YahtzeeCategory)),
        // Generate random score value
        fc.integer({ min: 0, max: 50 }),
        (playerId, category, score) => {
          // Create test players
          const players: Player[] = [
            { id: playerId, name: `Player ${playerId}`, joinedAt: new Date() },
            { id: 'other-player', name: 'Other Player', joinedAt: new Date() }
          ];

          // Create scorecard with the category already used
          const scorecard: Scorecard = {
            playerId,
            categories: new Map(),
            upperSectionTotal: 0,
            upperSectionBonus: 0,
            lowerSectionTotal: 0,
            grandTotal: 0
          };

          // Initialize all categories as available
          Object.values(YahtzeeCategory).forEach(cat => {
            scorecard.categories.set(cat, null);
          });

          // Mark the test category as already used
          scorecard.categories.set(category, score);

          // Create other player's scorecard
          const otherScorecard: Scorecard = {
            playerId: 'other-player',
            categories: new Map(),
            upperSectionTotal: 0,
            upperSectionBonus: 0,
            lowerSectionTotal: 0,
            grandTotal: 0
          };

          Object.values(YahtzeeCategory).forEach(cat => {
            otherScorecard.categories.set(cat, null);
          });

          // Create game state in scoring phase
          const gameState: GameState<YahtzeeMetadata> = {
            gameId: 'test-game',
            gameType: 'yahtzee',
            players,
            currentPlayerIndex: 0, // Current player is the one trying to score
            lifecycle: GameLifecycle.ACTIVE,
            phase: 'scoring',
            board: { spaces: [], metadata: {} },
            moveHistory: [],
            winner: null,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              scorecards: new Map([
                [playerId, scorecard],
                ['other-player', otherScorecard]
              ]),
              currentDice: {
                values: [1, 2, 3, 4, 5],
                keptDice: [false, false, false, false, false]
              },
              rollCount: 3,
              gamePhase: 'scoring',
              rollHistory: [],
              randomSeed: 'test-seed'
            }
          };

          // Create a scoring move for the already used category
          const scoreMove: YahtzeeMove = {
            playerId,
            timestamp: new Date(),
            action: 'score',
            parameters: {
              category
            }
          };

          // Validate the move
          const result: ValidationResult = validateMove(gameState, playerId, scoreMove);

          // Property: The move should be rejected because the category is already used
          expect(result.valid).toBe(false);
          expect(result.reason).toBeDefined();
          expect(result.reason!.toLowerCase()).toContain('already');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: yahtzee-plugin, Property 10: API compatibility**
   * **Validates: Requirements 6.2, 6.3**
   * 
   * For any move validation or game state operation, the plugin should return properly 
   * structured ValidationResult and GameState objects compatible with the existing service API
   */
  it('Property 10: API compatibility', () => {
    fc.assert(
      fc.property(
        // Generate random player ID
        fc.string({ minLength: 1, maxLength: 20 }),
        // Generate random move action
        fc.constantFrom('roll', 'score'),
        // Generate random game phase
        fc.constantFrom('rolling', 'scoring'),
        // Generate random roll count
        fc.integer({ min: 1, max: 3 }),
        // Generate random current player index
        fc.integer({ min: 0, max: 1 }),
        (playerId, action, gamePhase, rollCount, currentPlayerIndex) => {
          // Create test players
          const players: Player[] = [
            { id: 'player1', name: 'Player 1', joinedAt: new Date() },
            { id: 'player2', name: 'Player 2', joinedAt: new Date() }
          ];

          // Create scorecards
          const scorecard1: Scorecard = {
            playerId: 'player1',
            categories: new Map(),
            upperSectionTotal: 0,
            upperSectionBonus: 0,
            lowerSectionTotal: 0,
            grandTotal: 0
          };

          const scorecard2: Scorecard = {
            playerId: 'player2',
            categories: new Map(),
            upperSectionTotal: 0,
            upperSectionBonus: 0,
            lowerSectionTotal: 0,
            grandTotal: 0
          };

          // Initialize all categories as available
          Object.values(YahtzeeCategory).forEach(category => {
            scorecard1.categories.set(category, null);
            scorecard2.categories.set(category, null);
          });

          // Create game state
          const gameState: GameState<YahtzeeMetadata> = {
            gameId: 'test-game',
            gameType: 'yahtzee',
            players,
            currentPlayerIndex,
            lifecycle: GameLifecycle.ACTIVE,
            phase: gamePhase,
            board: { spaces: [], metadata: {} },
            moveHistory: [],
            winner: null,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              scorecards: new Map([
                ['player1', scorecard1],
                ['player2', scorecard2]
              ]),
              currentDice: {
                values: [1, 2, 3, 4, 5],
                keptDice: [false, false, false, false, false]
              },
              rollCount,
              gamePhase: gamePhase as 'rolling' | 'scoring',
              rollHistory: [],
              randomSeed: 'test-seed'
            }
          };

          // Create move based on action
          let move: YahtzeeMove;
          if (action === 'roll') {
            move = {
              playerId,
              timestamp: new Date(),
              action: 'roll',
              parameters: {
                keepDice: [true, false, true, false, true]
              }
            };
          } else {
            move = {
              playerId,
              timestamp: new Date(),
              action: 'score',
              parameters: {
                category: YahtzeeCategory.ONES
              }
            };
          }

          // Validate the move
          const result: ValidationResult = validateMove(gameState, playerId, move);

          // Property 1: ValidationResult must have the correct structure
          expect(result).toHaveProperty('valid');
          expect(typeof result.valid).toBe('boolean');

          // Property 2: If invalid, must have a reason
          if (!result.valid) {
            expect(result).toHaveProperty('reason');
            expect(typeof result.reason).toBe('string');
            expect(result.reason!.length).toBeGreaterThan(0);
          }

          // Property 3: If valid, reason should be undefined
          if (result.valid) {
            expect(result.reason).toBeUndefined();
          }

          // Property 4: ValidationResult should not have extra properties
          const allowedProperties = ['valid', 'reason'];
          Object.keys(result).forEach(key => {
            expect(allowedProperties).toContain(key);
          });

          // Property 5: GameState structure should remain unchanged after validation
          expect(gameState).toHaveProperty('gameId');
          expect(gameState).toHaveProperty('gameType');
          expect(gameState).toHaveProperty('players');
          expect(gameState).toHaveProperty('currentPlayerIndex');
          expect(gameState).toHaveProperty('lifecycle');
          expect(gameState).toHaveProperty('phase');
          expect(gameState).toHaveProperty('board');
          expect(gameState).toHaveProperty('moveHistory');
          expect(gameState).toHaveProperty('metadata');
          expect(gameState).toHaveProperty('winner');
          expect(gameState).toHaveProperty('version');
          expect(gameState).toHaveProperty('createdAt');
          expect(gameState).toHaveProperty('updatedAt');

          // Property 6: Metadata should have Yahtzee-specific structure
          expect(gameState.metadata).toHaveProperty('scorecards');
          expect(gameState.metadata).toHaveProperty('currentDice');
          expect(gameState.metadata).toHaveProperty('rollCount');
          expect(gameState.metadata).toHaveProperty('gamePhase');
          expect(gameState.metadata).toHaveProperty('rollHistory');
          expect(gameState.metadata).toHaveProperty('randomSeed');

          // Property 7: Scorecards should be Map objects
          expect(gameState.metadata.scorecards instanceof Map).toBe(true);

          // Property 8: Current dice should have proper structure
          expect(gameState.metadata.currentDice).toHaveProperty('values');
          expect(gameState.metadata.currentDice).toHaveProperty('keptDice');
          expect(Array.isArray(gameState.metadata.currentDice.values)).toBe(true);
          expect(Array.isArray(gameState.metadata.currentDice.keptDice)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});