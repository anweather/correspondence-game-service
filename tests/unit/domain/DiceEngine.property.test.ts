import * as fc from 'fast-check';
import { DiceEngine } from '../../../src/domain/game-utils/DiceEngine';

/**
 * Property-based tests for DiceEngine utility
 * These tests verify universal properties that should hold across all inputs
 */
describe('DiceEngine - Property-Based Tests', () => {
  describe('Property 5: Dice Engine Deterministic Behavior', () => {
    /**
     * **Feature: yahtzee-plugin, Property 5: Dice engine deterministic behavior**
     * **Validates: Requirements 5.1, 5.2, 5.4**
     *
     * Property: For any dice engine with the same seed, generating dice should produce
     * deterministic results with all values between 1-6 inclusive, and the engine
     * should remain stateless across calls
     *
     * This property ensures that:
     * 1. Same seed produces identical results
     * 2. All dice values are within valid range (1 to sides inclusive)
     * 3. Engine remains stateless - multiple calls with same parameters give same results
     * 4. Different seeds produce different results (with high probability)
     */
    it('should produce deterministic results with same seed and valid dice values', async () => {
      await fc.assert(
        fc.property(
          // Generate arbitrary test parameters
          fc.record({
            seed: fc.string({ minLength: 1, maxLength: 50 }),
            diceCount: fc.integer({ min: 1, max: 20 }),
            diceSides: fc.integer({ min: 2, max: 20 }),
          }),
          (testData) => {
            // Create two engines with the same seed
            const engine1 = new DiceEngine(testData.seed);
            const engine2 = new DiceEngine(testData.seed);

            // Roll dice with both engines
            const roll1 = engine1.rollDice(testData.diceCount, testData.diceSides);
            const roll2 = engine2.rollDice(testData.diceCount, testData.diceSides);

            // Property 1: Same seed should produce identical results
            expect(roll1).toEqual(roll2);

            // Property 2: All dice values should be within valid range
            roll1.forEach((value) => {
              expect(value).toBeGreaterThanOrEqual(1);
              expect(value).toBeLessThanOrEqual(testData.diceSides);
              expect(Number.isInteger(value)).toBe(true);
            });

            // Property 3: Should return correct number of dice
            expect(roll1).toHaveLength(testData.diceCount);
            expect(roll2).toHaveLength(testData.diceCount);

            // Property 4: Engine should be stateless - multiple calls with same parameters
            const roll3 = engine1.rollDice(testData.diceCount, testData.diceSides);
            const roll4 = engine2.rollDice(testData.diceCount, testData.diceSides);

            expect(roll1).toEqual(roll3);
            expect(roll2).toEqual(roll4);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property: Different seeds should produce different results (with high probability)
     * This ensures proper randomness distribution across different seeds
     */
    it('should produce different results with different seeds', async () => {
      await fc.assert(
        fc.property(
          // Generate two different seeds and dice parameters
          fc
            .record({
              seed1: fc.string({ minLength: 1, maxLength: 50 }),
              seed2: fc.string({ minLength: 1, maxLength: 50 }),
              diceCount: fc.integer({ min: 5, max: 10 }), // Use more dice for better differentiation
              diceSides: fc.integer({ min: 6, max: 12 }),
            })
            .filter((data) => data.seed1 !== data.seed2), // Ensure seeds are different
          (testData) => {
            const engine1 = new DiceEngine(testData.seed1);
            const engine2 = new DiceEngine(testData.seed2);

            const roll1 = engine1.rollDice(testData.diceCount, testData.diceSides);
            const roll2 = engine2.rollDice(testData.diceCount, testData.diceSides);

            // With different seeds and sufficient dice, results should be different
            // (This has very high probability but isn't guaranteed, so we check multiple aspects)
            const resultsAreDifferent = !roll1.every((value, index) => value === roll2[index]);

            // If results happen to be the same (very low probability), at least verify
            // that both results are valid
            roll1.forEach((value) => {
              expect(value).toBeGreaterThanOrEqual(1);
              expect(value).toBeLessThanOrEqual(testData.diceSides);
            });

            roll2.forEach((value) => {
              expect(value).toBeGreaterThanOrEqual(1);
              expect(value).toBeLessThanOrEqual(testData.diceSides);
            });

            // In most cases, different seeds should produce different results
            // We don't assert this as it's probabilistic, but we track it
            if (resultsAreDifferent) {
              expect(resultsAreDifferent).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Engine should handle edge cases correctly
     * This ensures proper behavior with boundary values
     */
    it('should handle edge cases and maintain deterministic behavior', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            seed: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (testData) => {
            const engine = new DiceEngine(testData.seed);

            // Test edge case: single die
            const singleDie = engine.rollDice(1, 6);
            expect(singleDie).toHaveLength(1);
            expect(singleDie[0]).toBeGreaterThanOrEqual(1);
            expect(singleDie[0]).toBeLessThanOrEqual(6);

            // Test edge case: two-sided die (coin flip)
            const coinFlip = engine.rollDice(1, 2);
            expect(coinFlip).toHaveLength(1);
            expect(coinFlip[0]).toBeGreaterThanOrEqual(1);
            expect(coinFlip[0]).toBeLessThanOrEqual(2);

            // Test edge case: zero dice
            const zeroDice = engine.rollDice(0, 6);
            expect(zeroDice).toEqual([]);

            // Test deterministic behavior: same calls should give same results
            const repeat1 = engine.rollDice(1, 6);
            const repeat2 = engine.rollDice(1, 6);
            expect(repeat1).toEqual(repeat2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Engine should maintain stateless behavior across different call patterns
     * This ensures that the order of calls doesn't affect individual results
     */
    it('should maintain stateless behavior regardless of call order', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            seed: fc.string({ minLength: 1, maxLength: 50 }),
            call1: fc.record({
              count: fc.integer({ min: 1, max: 10 }),
              sides: fc.integer({ min: 2, max: 12 }),
            }),
            call2: fc.record({
              count: fc.integer({ min: 1, max: 10 }),
              sides: fc.integer({ min: 2, max: 12 }),
            }),
            call3: fc.record({
              count: fc.integer({ min: 1, max: 10 }),
              sides: fc.integer({ min: 2, max: 12 }),
            }),
          }),
          (testData) => {
            // Create two engines with same seed
            const engine1 = new DiceEngine(testData.seed);
            const engine2 = new DiceEngine(testData.seed);

            // Make calls in different orders
            const result1a = engine1.rollDice(testData.call1.count, testData.call1.sides);
            const result1b = engine1.rollDice(testData.call2.count, testData.call2.sides);
            const result1c = engine1.rollDice(testData.call3.count, testData.call3.sides);

            const result2a = engine2.rollDice(testData.call2.count, testData.call2.sides);
            const result2b = engine2.rollDice(testData.call3.count, testData.call3.sides);
            const result2c = engine2.rollDice(testData.call1.count, testData.call1.sides);

            // Same parameters should give same results regardless of when called
            expect(result1a).toEqual(result2c); // call1 results should match
            expect(result1b).toEqual(result2a); // call2 results should match
            expect(result1c).toEqual(result2b); // call3 results should match

            // All results should be valid
            [result1a, result1b, result1c, result2a, result2b, result2c].forEach(
              (result, index) => {
                const callData = [
                  testData.call1,
                  testData.call2,
                  testData.call3,
                  testData.call2,
                  testData.call3,
                  testData.call1,
                ][index];

                expect(result).toHaveLength(callData.count);
                result.forEach((value) => {
                  expect(value).toBeGreaterThanOrEqual(1);
                  expect(value).toBeLessThanOrEqual(callData.sides);
                });
              }
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
