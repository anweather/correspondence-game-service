/**
 * Property-based tests for Yahtzee initialization module
 * These tests verify universal properties that should hold across all inputs
 */

import * as fc from 'fast-check';
import { Player, GameLifecycle } from '../../../../src/domain/models';
import { GameConfig } from '../../../../src/domain/interfaces';
import { YahtzeeMetadata } from '../../shared/types';
import { DICE_COUNT, ALL_CATEGORIES, MIN_PLAYERS, MAX_PLAYERS } from '../../shared/constants';
import * as initialization from '../initialization';

describe('Yahtzee Initialization - Property-Based Tests', () => {
  describe('Property 1: Game Initialization Completeness', () => {
    /**
     * **Feature: yahtzee-plugin, Property 1: Game initialization completeness**
     * **Validates: Requirements 1.2, 1.3**
     *
     * Property: For any valid player count (1-8), initializing a game should create
     * a complete scorecard for each player with all 13 categories available and
     * establish a valid turn order
     *
     * This property ensures that:
     * 1. Every player gets exactly one scorecard
     * 2. Every scorecard has all 13 categories initialized as null (available)
     * 3. All scorecard totals start at zero
     * 4. Game starts with first player (index 0)
     * 5. Initial dice state is properly configured
     * 6. Game metadata is complete and valid
     */
    it('should create complete game state for any valid player count', async () => {
      await fc.assert(
        fc.property(
          // Generate arbitrary test parameters
          fc.record({
            playerCount: fc.integer({ min: MIN_PLAYERS, max: MAX_PLAYERS }),
            gameIdSuffix: fc.string({ minLength: 1, maxLength: 20 }),
            playerNamePrefix: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          (testData) => {
            // Generate players
            const players: Player[] = Array.from({ length: testData.playerCount }, (_, i) => ({
              id: `player-${i + 1}`,
              name: `${testData.playerNamePrefix}-${i + 1}`,
              joinedAt: new Date(Date.now() + i * 1000), // Stagger join times
            }));

            const config: GameConfig = {
              customSettings: {
                gameId: `test-yahtzee-${testData.gameIdSuffix}`,
              },
            };

            // Initialize game
            const gameState = initialization.initializeGame(players, config);
            const metadata = gameState.metadata as YahtzeeMetadata;

            // Property 1: Basic game state structure
            expect(gameState.gameId).toBe(`test-yahtzee-${testData.gameIdSuffix}`);
            expect(gameState.gameType).toBe('yahtzee');
            expect(gameState.lifecycle).toBe(GameLifecycle.ACTIVE);
            expect(gameState.players).toEqual(players);
            expect(gameState.currentPlayerIndex).toBe(0); // First player starts
            expect(gameState.phase).toBe('rolling');
            expect(gameState.moveHistory).toEqual([]);
            expect(gameState.winner).toBeNull();
            expect(gameState.version).toBe(1);

            // Property 2: Every player gets exactly one scorecard
            expect(metadata.scorecards.size).toBe(testData.playerCount);
            players.forEach(player => {
              expect(metadata.scorecards.has(player.id)).toBe(true);
            });

            // Property 3: Every scorecard has all 13 categories initialized as null
            metadata.scorecards.forEach((scorecard, playerId) => {
              expect(scorecard.playerId).toBe(playerId);
              expect(scorecard.categories.size).toBe(13);
              
              // All categories should be null (available)
              ALL_CATEGORIES.forEach(category => {
                expect(scorecard.categories.get(category)).toBeNull();
              });

              // All totals should be zero
              expect(scorecard.upperSectionTotal).toBe(0);
              expect(scorecard.upperSectionBonus).toBe(0);
              expect(scorecard.lowerSectionTotal).toBe(0);
              expect(scorecard.grandTotal).toBe(0);
            });

            // Property 4: Initial dice state is properly configured
            expect(metadata.currentDice.values).toHaveLength(DICE_COUNT);
            expect(metadata.currentDice.keptDice).toHaveLength(DICE_COUNT);
            
            // All dice values should be valid (1-6)
            metadata.currentDice.values.forEach(value => {
              expect(value).toBeGreaterThanOrEqual(1);
              expect(value).toBeLessThanOrEqual(6);
              expect(Number.isInteger(value)).toBe(true);
            });

            // All dice should initially not be kept
            metadata.currentDice.keptDice.forEach(kept => {
              expect(kept).toBe(false);
            });

            // Property 5: Game metadata is complete and valid
            expect(metadata.rollCount).toBe(0);
            expect(metadata.gamePhase).toBe('rolling');
            expect(metadata.rollHistory).toEqual([]);
            expect(metadata.randomSeed).toBeDefined();
            expect(typeof metadata.randomSeed).toBe('string');
            expect(metadata.randomSeed.length).toBeGreaterThan(0);

            // Property 6: Timestamps are valid
            expect(gameState.createdAt).toBeInstanceOf(Date);
            expect(gameState.updatedAt).toBeInstanceOf(Date);
            expect(gameState.createdAt.getTime()).toBeLessThanOrEqual(gameState.updatedAt.getTime());
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property: Game initialization should handle edge cases correctly
     * This ensures proper behavior with boundary values (min/max players)
     */
    it('should handle edge cases correctly', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            useMinPlayers: fc.boolean(),
            gameIdSuffix: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          (testData) => {
            const playerCount = testData.useMinPlayers ? MIN_PLAYERS : MAX_PLAYERS;
            
            // Generate players for edge case
            const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
              id: `edge-player-${i + 1}`,
              name: `Edge Player ${i + 1}`,
              joinedAt: new Date(),
            }));

            const config: GameConfig = {
              customSettings: {
                gameId: `edge-test-${testData.gameIdSuffix}`,
              },
            };

            // Initialize game
            const gameState = initialization.initializeGame(players, config);
            const metadata = gameState.metadata as YahtzeeMetadata;

            // Should work correctly for both min and max players
            expect(gameState.players).toHaveLength(playerCount);
            expect(metadata.scorecards.size).toBe(playerCount);

            // All players should have valid scorecards
            players.forEach(player => {
              const scorecard = metadata.scorecards.get(player.id);
              expect(scorecard).toBeDefined();
              expect(scorecard!.playerId).toBe(player.id);
              expect(scorecard!.categories.size).toBe(13);
            });

            // Game should be in valid initial state
            expect(gameState.currentPlayerIndex).toBe(0);
            expect(gameState.lifecycle).toBe(GameLifecycle.ACTIVE);
            expect(metadata.gamePhase).toBe('rolling');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Game initialization without custom game ID should generate unique IDs
     * This ensures proper ID generation when no custom ID is provided
     */
    it('should generate unique game IDs when not provided', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            playerCount: fc.integer({ min: MIN_PLAYERS, max: MAX_PLAYERS }),
            iterations: fc.integer({ min: 2, max: 5 }), // Generate multiple games to test uniqueness
          }),
          (testData) => {
            const players: Player[] = Array.from({ length: testData.playerCount }, (_, i) => ({
              id: `unique-test-player-${i + 1}`,
              name: `Player ${i + 1}`,
              joinedAt: new Date(),
            }));

            const config: GameConfig = {}; // No custom game ID

            // Generate multiple games
            const gameIds = new Set<string>();
            for (let i = 0; i < testData.iterations; i++) {
              const gameState = initialization.initializeGame(players, config);
              
              // Game ID should be defined and follow expected pattern
              expect(gameState.gameId).toBeDefined();
              expect(gameState.gameId).toMatch(/^yahtzee-\d+-[a-z0-9]+$/);
              
              // Should be unique
              expect(gameIds.has(gameState.gameId)).toBe(false);
              gameIds.add(gameState.gameId);

              // Other properties should still be valid
              expect(gameState.players).toHaveLength(testData.playerCount);
              expect(gameState.lifecycle).toBe(GameLifecycle.ACTIVE);
            }

            // All generated IDs should be unique
            expect(gameIds.size).toBe(testData.iterations);
          }
        ),
        { numRuns: 50 } // Fewer runs since we're generating multiple games per run
      );
    });

    /**
     * Property: Scorecard creation should be consistent and complete
     * This ensures that individual scorecard creation maintains all invariants
     */
    it('should create consistent and complete scorecards', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (testData) => {
            const scorecard = initialization.createEmptyScorecard(testData.playerId);

            // Property: Scorecard should have correct player ID
            expect(scorecard.playerId).toBe(testData.playerId);

            // Property: Should have all 13 categories
            expect(scorecard.categories.size).toBe(13);

            // Property: All categories should be null (available)
            ALL_CATEGORIES.forEach(category => {
              expect(scorecard.categories.get(category)).toBeNull();
            });

            // Property: All totals should be zero
            expect(scorecard.upperSectionTotal).toBe(0);
            expect(scorecard.upperSectionBonus).toBe(0);
            expect(scorecard.lowerSectionTotal).toBe(0);
            expect(scorecard.grandTotal).toBe(0);

            // Property: Categories map should contain exactly the expected categories
            const categoriesArray = Array.from(scorecard.categories.keys());
            expect(categoriesArray.sort()).toEqual([...ALL_CATEGORIES].sort());
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Initial dice state should be valid and consistent
     * This ensures that dice state creation maintains all invariants
     */
    it('should create valid and consistent initial dice state', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            // No parameters needed - dice state creation is deterministic in structure
            iteration: fc.integer({ min: 1, max: 100 }),
          }),
          (_testData) => {
            const diceState = initialization.createInitialDiceState();

            // Property: Should have correct number of dice
            expect(diceState.values).toHaveLength(DICE_COUNT);
            expect(diceState.keptDice).toHaveLength(DICE_COUNT);

            // Property: All dice values should be valid (1-6)
            diceState.values.forEach(value => {
              expect(value).toBeGreaterThanOrEqual(1);
              expect(value).toBeLessThanOrEqual(6);
              expect(Number.isInteger(value)).toBe(true);
            });

            // Property: All dice should initially not be kept
            diceState.keptDice.forEach(kept => {
              expect(kept).toBe(false);
            });

            // Property: Arrays should have same length
            expect(diceState.values.length).toBe(diceState.keptDice.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});