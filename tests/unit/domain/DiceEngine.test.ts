import { DiceEngine } from '../../../src/domain/game-utils/DiceEngine';

describe('DiceEngine', () => {
  describe('Constructor and Seed Management', () => {
    it('should create DiceEngine with random seed when no seed provided', () => {
      const engine = new DiceEngine();
      const seed = engine.getSeed();

      expect(seed).toBeDefined();
      expect(typeof seed).toBe('string');
      expect(seed.length).toBeGreaterThan(0);
    });

    it('should create DiceEngine with provided seed', () => {
      const testSeed = 'test-seed-123';
      const engine = new DiceEngine(testSeed);

      expect(engine.getSeed()).toBe(testSeed);
    });

    it('should generate different random seeds for different instances', () => {
      const engine1 = new DiceEngine();
      const engine2 = new DiceEngine();

      expect(engine1.getSeed()).not.toBe(engine2.getSeed());
    });
  });

  describe('Seeded Random Generation', () => {
    it('should produce deterministic results with same seed', () => {
      const seed = 'deterministic-seed';
      const engine1 = new DiceEngine(seed);
      const engine2 = new DiceEngine(seed);

      const roll1 = engine1.rollDice(5, 6);
      const roll2 = engine2.rollDice(5, 6);

      expect(roll1).toEqual(roll2);
    });

    it('should produce different results with different seeds', () => {
      const engine1 = new DiceEngine('seed1');
      const engine2 = new DiceEngine('seed2');

      const roll1 = engine1.rollDice(5, 6);
      const roll2 = engine2.rollDice(5, 6);

      // With different seeds, results should be different (very high probability)
      expect(roll1).not.toEqual(roll2);
    });
  });

  describe('N Dice with M Sides Interface', () => {
    it('should roll correct number of dice', () => {
      const engine = new DiceEngine('test-seed');

      const roll3Dice = engine.rollDice(3, 6);
      const roll5Dice = engine.rollDice(5, 6);
      const roll1Die = engine.rollDice(1, 6);

      expect(roll3Dice).toHaveLength(3);
      expect(roll5Dice).toHaveLength(5);
      expect(roll1Die).toHaveLength(1);
    });

    it('should generate values within correct range for 6-sided dice', () => {
      const engine = new DiceEngine('test-seed');
      const roll = engine.rollDice(10, 6);

      roll.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
        expect(Number.isInteger(value)).toBe(true);
      });
    });

    it('should generate values within correct range for different sided dice', () => {
      const engine = new DiceEngine('test-seed');

      const d4Roll = engine.rollDice(5, 4);
      const d8Roll = engine.rollDice(5, 8);
      const d20Roll = engine.rollDice(5, 20);

      d4Roll.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(4);
      });

      d8Roll.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(8);
      });

      d20Roll.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(20);
      });
    });

    it('should handle edge cases for dice parameters', () => {
      const engine = new DiceEngine('test-seed');

      // Single die
      const singleDie = engine.rollDice(1, 6);
      expect(singleDie).toHaveLength(1);
      expect(singleDie[0]).toBeGreaterThanOrEqual(1);
      expect(singleDie[0]).toBeLessThanOrEqual(6);

      // Two-sided die (coin flip)
      const coinFlip = engine.rollDice(1, 2);
      expect(coinFlip).toHaveLength(1);
      expect(coinFlip[0]).toBeGreaterThanOrEqual(1);
      expect(coinFlip[0]).toBeLessThanOrEqual(2);
    });
  });

  describe('Stateless Behavior', () => {
    it('should be stateless - multiple calls with same parameters should give same results', () => {
      const engine = new DiceEngine('stateless-test');

      const roll1 = engine.rollDice(3, 6);
      const roll2 = engine.rollDice(3, 6);

      expect(roll1).toEqual(roll2);
    });

    it('should not maintain internal state between different roll calls', () => {
      const engine = new DiceEngine('state-test');

      // Make several different rolls
      const roll1 = engine.rollDice(2, 6);
      const roll2 = engine.rollDice(4, 8);
      const roll3 = engine.rollDice(2, 6); // Same as first call

      // First and third calls should be identical (stateless)
      expect(roll1).toEqual(roll3);
      expect(roll1).not.toEqual(roll2); // Different parameters should give different results
    });

    it('should produce consistent results regardless of call order', () => {
      const engine1 = new DiceEngine('order-test');
      const engine2 = new DiceEngine('order-test');

      // Different call patterns but same final call
      const result1a = engine1.rollDice(3, 6);
      const result1b = engine1.rollDice(2, 8);
      const result1c = engine1.rollDice(5, 6);

      const result2a = engine2.rollDice(2, 8);
      const result2b = engine2.rollDice(5, 6);
      const result2c = engine2.rollDice(3, 6);

      // Same parameters should give same results regardless of when called
      expect(result1a).toEqual(result2c);
      expect(result1b).toEqual(result2a);
      expect(result1c).toEqual(result2b);
    });
  });

  describe('Error Handling', () => {
    it('should handle zero dice count', () => {
      const engine = new DiceEngine('error-test');
      const result = engine.rollDice(0, 6);

      expect(result).toEqual([]);
    });

    it('should handle invalid parameters gracefully', () => {
      const engine = new DiceEngine('error-test');

      expect(() => engine.rollDice(-1, 6)).toThrow();
      expect(() => engine.rollDice(5, 0)).toThrow();
      expect(() => engine.rollDice(5, -1)).toThrow();
    });
  });
});
