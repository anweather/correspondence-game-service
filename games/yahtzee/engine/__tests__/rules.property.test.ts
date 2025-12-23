/**
 * Property-based tests for Yahtzee rules module
 * Tests universal properties that should hold across all valid executions
 */

import fc from 'fast-check';
import { applyMove, isGameOver, getWinner } from '../rules';
import { validateMove } from '../validation';
import { GameState, Player, GameLifecycle } from '@domain/models';
import { YahtzeeMove, YahtzeeMetadata, YahtzeeCategory, Scorecard } from '../../shared/types';
import { MAX_ROLLS_PER_TURN, DICE_COUNT } from '../../shared/constants';

describe('Yahtzee Rules Property Tests', () => {
  /**
   * **Feature: yahtzee-plugin, Property 2: Turn management consistency**
   * **Validates: Requirements 1.4, 2.4, 3.5**
   */
  describe('Property 2: Turn management consistency', () => {
    it('should ensure only current player can make valid moves and completing turn advances to next player', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 4 }), // Number of players
          fc.integer({ min: 0, max: 2 }), // Current player index (will be adjusted)
          fc.integer({ min: 1, max: MAX_ROLLS_PER_TURN }), // Roll count
          fc.constantFrom('rolling', 'scoring'), // Game phase
          fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 5, maxLength: 5 }), // Dice values
          fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }), // Keep dice selection
          fc.constantFrom(...Object.values(YahtzeeCategory)), // Category for scoring
          (numPlayers, playerIndex, rollCount, gamePhase, diceValues, keepDice, category) => {
            // Adjust player index to be valid
            const currentPlayerIndex = playerIndex % numPlayers;

            // Create test players
            const players: Player[] = [];
            for (let i = 0; i < numPlayers; i++) {
              players.push({
                id: `player${i + 1}`,
                name: `Player ${i + 1}`,
                joinedAt: new Date(),
              });
            }

            // Create scorecards for all players
            const scorecards = new Map<string, Scorecard>();
            players.forEach((player) => {
              const scorecard: Scorecard = {
                playerId: player.id,
                categories: new Map(),
                upperSectionTotal: 0,
                upperSectionBonus: 0,
                lowerSectionTotal: 0,
                grandTotal: 0,
              };

              // Initialize all categories as available
              Object.values(YahtzeeCategory).forEach((cat) => {
                scorecard.categories.set(cat, null);
              });

              scorecards.set(player.id, scorecard);
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
                scorecards,
                currentDice: {
                  values: diceValues,
                  keptDice: keepDice,
                },
                rollCount,
                gamePhase: gamePhase as 'rolling' | 'scoring',
                rollHistory: [],
                randomSeed: 'test-seed',
              },
            };

            const currentPlayer = players[currentPlayerIndex];
            const nextPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
            const nextPlayer = players[nextPlayerIndex];

            // Test 1: Current player should be able to make valid moves
            if (gamePhase === 'rolling' && rollCount < MAX_ROLLS_PER_TURN) {
              const rollMove: YahtzeeMove = {
                playerId: currentPlayer.id,
                timestamp: new Date(),
                action: 'roll',
                parameters: { keepDice },
              };

              const validation = validateMove(gameState, currentPlayer.id, rollMove);
              expect(validation.valid).toBe(true);
            }

            if (gamePhase === 'scoring') {
              // Only test if category is available
              const scorecard = scorecards.get(currentPlayer.id)!;
              if (scorecard.categories.get(category) === null) {
                const scoreMove: YahtzeeMove = {
                  playerId: currentPlayer.id,
                  timestamp: new Date(),
                  action: 'score',
                  parameters: { category },
                };

                const validation = validateMove(gameState, currentPlayer.id, scoreMove);
                expect(validation.valid).toBe(true);
              }
            }

            // Test 2: Non-current players should not be able to make moves
            const wrongPlayer = nextPlayer;
            const wrongPlayerMove: YahtzeeMove = {
              playerId: wrongPlayer.id,
              timestamp: new Date(),
              action: gamePhase === 'rolling' ? 'roll' : 'score',
              parameters: gamePhase === 'rolling' ? { keepDice } : { category },
            };

            const wrongValidation = validateMove(gameState, wrongPlayer.id, wrongPlayerMove);
            expect(wrongValidation.valid).toBe(false);
            expect(wrongValidation.reason).toContain('not your turn');

            // Test 3: Completing a scoring move should advance to next player
            if (gamePhase === 'scoring') {
              const scorecard = scorecards.get(currentPlayer.id)!;
              if (scorecard.categories.get(category) === null) {
                const scoreMove: YahtzeeMove = {
                  playerId: currentPlayer.id,
                  timestamp: new Date(),
                  action: 'score',
                  parameters: { category },
                };

                const newState = applyMove(gameState, currentPlayer.id, scoreMove);

                // Should advance to next player
                expect(newState.currentPlayerIndex).toBe(nextPlayerIndex);

                // Should reset turn state
                expect(newState.metadata.rollCount).toBe(0);
                expect(newState.metadata.gamePhase).toBe('rolling');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: yahtzee-plugin, Property 6: Dice keep selection preservation**
   * **Validates: Requirements 2.2, 2.3**
   */
  describe('Property 6: Dice keep selection preservation', () => {
    it('should preserve kept dice values while re-rolling non-kept dice', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 5, maxLength: 5 }), // Initial dice values
          fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }), // Keep dice selection
          fc.integer({ min: 1, max: MAX_ROLLS_PER_TURN - 1 }), // Roll count (not max)
          (initialDice, keepDice, rollCount) => {
            // Create minimal game state for testing
            const players: Player[] = [{ id: 'player1', name: 'Player 1', joinedAt: new Date() }];

            const scorecard: Scorecard = {
              playerId: 'player1',
              categories: new Map(),
              upperSectionTotal: 0,
              upperSectionBonus: 0,
              lowerSectionTotal: 0,
              grandTotal: 0,
            };

            Object.values(YahtzeeCategory).forEach((category) => {
              scorecard.categories.set(category, null);
            });

            const gameState: GameState<YahtzeeMetadata> = {
              gameId: 'test-game',
              gameType: 'yahtzee',
              players,
              currentPlayerIndex: 0,
              lifecycle: GameLifecycle.ACTIVE,
              phase: 'rolling',
              board: { spaces: [], metadata: {} },
              moveHistory: [],
              winner: null,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: {
                scorecards: new Map([['player1', scorecard]]),
                currentDice: {
                  values: initialDice,
                  keptDice: [false, false, false, false, false],
                },
                rollCount,
                gamePhase: 'rolling',
                rollHistory: [],
                randomSeed: 'test-seed-consistent',
              },
            };

            const rollMove: YahtzeeMove = {
              playerId: 'player1',
              timestamp: new Date(),
              action: 'roll',
              parameters: { keepDice },
            };

            const newState = applyMove(gameState, 'player1', rollMove);

            // Check that kept dice values are preserved
            for (let i = 0; i < DICE_COUNT; i++) {
              if (keepDice[i]) {
                expect(newState.metadata.currentDice.values[i]).toBe(initialDice[i]);
              }
              // Non-kept dice should be valid dice values (1-6)
              expect(newState.metadata.currentDice.values[i]).toBeGreaterThanOrEqual(1);
              expect(newState.metadata.currentDice.values[i]).toBeLessThanOrEqual(6);
            }

            // Keep selection should be updated
            expect(newState.metadata.currentDice.keptDice).toEqual(keepDice);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: yahtzee-plugin, Property 4: Game completion detection**
   * **Validates: Requirements 1.5**
   */
  describe('Property 4: Game completion detection', () => {
    it('should correctly detect game completion when all categories are filled', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }), // Number of players
          fc.array(fc.integer({ min: 0, max: 300 }), { minLength: 13, maxLength: 13 }), // Scores for categories
          (numPlayers, categoryScores) => {
            // Create test players
            const players: Player[] = [];
            for (let i = 0; i < numPlayers; i++) {
              players.push({
                id: `player${i + 1}`,
                name: `Player ${i + 1}`,
                joinedAt: new Date(),
              });
            }

            // Create scorecards with all categories filled
            const scorecards = new Map<string, Scorecard>();
            players.forEach((player) => {
              const scorecard: Scorecard = {
                playerId: player.id,
                categories: new Map(),
                upperSectionTotal: 0,
                upperSectionBonus: 0,
                lowerSectionTotal: 0,
                grandTotal: 0,
              };

              // Fill all categories with scores
              Object.values(YahtzeeCategory).forEach((category, categoryIndex) => {
                const score = categoryScores[categoryIndex % categoryScores.length];
                scorecard.categories.set(category, score);
              });

              // Calculate totals (simplified)
              scorecard.grandTotal = categoryScores.reduce((sum, score) => sum + score, 0);

              scorecards.set(player.id, scorecard);
            });

            const gameState: GameState<YahtzeeMetadata> = {
              gameId: 'test-game',
              gameType: 'yahtzee',
              players,
              currentPlayerIndex: 0,
              lifecycle: GameLifecycle.ACTIVE,
              phase: 'scoring',
              board: { spaces: [], metadata: {} },
              moveHistory: [],
              winner: null,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: {
                scorecards,
                currentDice: {
                  values: [1, 2, 3, 4, 5],
                  keptDice: [false, false, false, false, false],
                },
                rollCount: 0,
                gamePhase: 'scoring',
                rollHistory: [],
                randomSeed: 'test-seed',
              },
            };

            // Game should be detected as over
            expect(isGameOver(gameState)).toBe(true);

            // Winner should be determined correctly
            const winner = getWinner(gameState);
            if (winner !== null) {
              const winnerScorecard = scorecards.get(winner)!;
              // Winner should have the highest or tied highest score
              for (const [playerId, scorecard] of scorecards.entries()) {
                if (playerId !== winner) {
                  expect(winnerScorecard.grandTotal).toBeGreaterThanOrEqual(scorecard.grandTotal);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect game as complete when categories remain unfilled', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }), // Number of players
          fc.integer({ min: 0, max: 12 }), // Number of categories to fill (not all)
          (numPlayers, categoriesToFill) => {
            // Create test players
            const players: Player[] = [];
            for (let i = 0; i < numPlayers; i++) {
              players.push({
                id: `player${i + 1}`,
                name: `Player ${i + 1}`,
                joinedAt: new Date(),
              });
            }

            // Create scorecards with some categories unfilled
            const scorecards = new Map<string, Scorecard>();
            const allCategories = Object.values(YahtzeeCategory);

            players.forEach((player) => {
              const scorecard: Scorecard = {
                playerId: player.id,
                categories: new Map(),
                upperSectionTotal: 0,
                upperSectionBonus: 0,
                lowerSectionTotal: 0,
                grandTotal: 0,
              };

              // Fill only some categories
              allCategories.forEach((category, index) => {
                if (index < categoriesToFill) {
                  scorecard.categories.set(category, 10); // Arbitrary score
                } else {
                  scorecard.categories.set(category, null); // Unfilled
                }
              });

              scorecards.set(player.id, scorecard);
            });

            const gameState: GameState<YahtzeeMetadata> = {
              gameId: 'test-game',
              gameType: 'yahtzee',
              players,
              currentPlayerIndex: 0,
              lifecycle: GameLifecycle.ACTIVE,
              phase: 'rolling',
              board: { spaces: [], metadata: {} },
              moveHistory: [],
              winner: null,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: {
                scorecards,
                currentDice: {
                  values: [1, 2, 3, 4, 5],
                  keptDice: [false, false, false, false, false],
                },
                rollCount: 0,
                gamePhase: 'rolling',
                rollHistory: [],
                randomSeed: 'test-seed',
              },
            };

            // Game should not be detected as over if not all categories filled
            if (categoriesToFill < allCategories.length) {
              expect(isGameOver(gameState)).toBe(false);
              expect(getWinner(gameState)).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
