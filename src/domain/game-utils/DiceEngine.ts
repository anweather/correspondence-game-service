/**
 * DiceEngine - Reusable Dice Generation Utility
 *
 * Provides seeded random number generation for dice-based games.
 * Uses a simple Linear Congruential Generator (LCG) for deterministic results.
 */

/**
 * Reusable dice generation utility with seeded random generation
 *
 * This class provides deterministic dice rolling using a seeded random
 * number generator, making games reproducible for testing and replay.
 */
export class DiceEngine {
  private seed: string;

  /**
   * Create a new DiceEngine with a random seed
   *
   * @param seed Optional seed for deterministic generation
   */
  constructor(seed?: string) {
    this.seed = seed || this.generateRandomSeed();
  }

  /**
   * Roll N dice with M sides each
   *
   * @param count Number of dice to roll
   * @param sides Number of sides per die
   * @returns Array of dice values
   */
  rollDice(count: number, sides: number): number[] {
    // Validate input parameters
    if (count < 0) {
      throw new Error('Dice count cannot be negative');
    }
    if (sides <= 0) {
      throw new Error('Dice sides must be positive');
    }

    // Handle zero dice case
    if (count === 0) {
      return [];
    }

    const results: number[] = [];

    // Create a seeded random generator for this specific call
    // Use seed + parameters to ensure stateless behavior
    const callSeed = this.hashString(this.seed + count + sides);
    let rng = this.seedToNumber(callSeed);

    for (let i = 0; i < count; i++) {
      // Linear Congruential Generator (LCG) formula
      rng = (rng * 1664525 + 1013904223) % 4294967296;

      // Convert to 1-based dice value
      const diceValue = Math.floor((rng / 4294967296) * sides) + 1;
      results.push(diceValue);
    }

    return results;
  }

  /**
   * Get the current seed being used
   *
   * @returns The seed string
   */
  getSeed(): string {
    return this.seed;
  }

  /**
   * Generate a random seed string
   *
   * @returns Random seed string
   */
  private generateRandomSeed(): string {
    // Generate a random seed using current timestamp and random values
    const timestamp = Date.now().toString();
    const random1 = Math.random().toString(36).substring(2);
    const random2 = Math.random().toString(36).substring(2);

    return `${timestamp}-${random1}-${random2}`;
  }

  /**
   * Convert a string seed to a numeric value for the RNG
   *
   * @param seed String seed to convert
   * @returns Numeric seed value
   */
  private seedToNumber(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Simple string hashing function
   *
   * @param str String to hash
   * @returns Hashed string
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }
}
