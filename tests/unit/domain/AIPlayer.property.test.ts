import * as fc from 'fast-check';
import { AIPlayer } from '@domain/models/AIPlayer';

/**
 * Property-based tests for AIPlayer domain model
 * These tests verify universal properties that should hold across all inputs
 */
describe('AIPlayer - Property-Based Tests', () => {
  describe('Property 1: AI Player Unique Identification', () => {
    /**
     * **Feature: ai-player-system, Property 1: AI Player Unique Identification**
     * **Validates: Requirements 1.3, 4.1**
     *
     * Property: For any game created with AI players, all player IDs should be unique
     * and AI players should be identifiable through metadata
     *
     * This property ensures that:
     * 1. AI players have unique identifiers
     * 2. AI players can be converted to regular Player objects
     * 3. AI players are identifiable through metadata
     * 4. AI player properties are preserved through conversion
     */
    it('should create unique AI players with identifiable metadata', async () => {
      await fc.assert(
        fc.property(
          // Generate arbitrary AI player configurations
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            gameType: fc.constantFrom('tic-tac-toe', 'connect-four', 'chess', 'checkers'),
            strategyId: fc.constantFrom('random', 'easy', 'medium', 'hard', 'perfect'),
            difficulty: fc.option(fc.constantFrom('easy', 'medium', 'hard'), { nil: undefined }),
            configuration: fc.option(
              fc.record({
                timeout: fc.integer({ min: 100, max: 5000 }),
                maxDepth: fc.integer({ min: 1, max: 10 }),
              }),
              { nil: undefined }
            ),
          }),
          (aiPlayerData) => {
            // Create AI player
            const aiPlayer = new AIPlayer(
              aiPlayerData.id,
              aiPlayerData.name,
              aiPlayerData.gameType,
              aiPlayerData.strategyId,
              aiPlayerData.difficulty,
              aiPlayerData.configuration
            );

            // Verify AI player has all required properties
            expect(aiPlayer.id).toBe(aiPlayerData.id);
            expect(aiPlayer.name).toBe(aiPlayerData.name);
            expect(aiPlayer.gameType).toBe(aiPlayerData.gameType);
            expect(aiPlayer.strategyId).toBe(aiPlayerData.strategyId);
            expect(aiPlayer.difficulty).toBe(aiPlayerData.difficulty);
            expect(aiPlayer.configuration).toEqual(aiPlayerData.configuration);
            expect(aiPlayer.createdAt).toBeInstanceOf(Date);

            // Convert to regular Player object
            const player = aiPlayer.toPlayer();

            // Verify player has unique ID (same as AI player)
            expect(player.id).toBe(aiPlayer.id);
            expect(player.name).toBe(aiPlayer.name);
            expect(player.joinedAt).toBe(aiPlayer.createdAt);

            // Verify AI player is identifiable through metadata
            expect(player.metadata).toBeDefined();
            expect(player.metadata?.isAI).toBe(true);
            expect(player.metadata?.strategyId).toBe(aiPlayer.strategyId);
            expect(player.metadata?.difficulty).toBe(aiPlayer.difficulty);
            expect(player.metadata?.configuration).toEqual(aiPlayer.configuration);

            // Verify utility methods work correctly
            expect(aiPlayer.usesStrategy(aiPlayerData.strategyId)).toBe(true);
            expect(aiPlayer.usesStrategy('non-existent-strategy')).toBe(false);
            expect(aiPlayer.isForGameType(aiPlayerData.gameType)).toBe(true);
            expect(aiPlayer.isForGameType('non-existent-game')).toBe(false);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property: AI players with different IDs should be distinguishable
     * This ensures proper uniqueness across multiple AI players
     */
    it('should maintain uniqueness across multiple AI players', async () => {
      await fc.assert(
        fc.property(
          // Generate multiple AI player configurations
          fc
            .array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
                name: fc
                  .string({ minLength: 1, maxLength: 100 })
                  .filter((s) => s.trim().length > 0),
                gameType: fc.constantFrom('tic-tac-toe', 'connect-four'),
                strategyId: fc.constantFrom('random', 'easy', 'hard'),
              }),
              { minLength: 2, maxLength: 8 }
            )
            .filter((players) => {
              // Ensure all IDs are unique
              const ids = players.map((p) => p.id);
              return new Set(ids).size === ids.length;
            }),
          (aiPlayerConfigs) => {
            // Create AI players
            const aiPlayers = aiPlayerConfigs.map(
              (config) => new AIPlayer(config.id, config.name, config.gameType, config.strategyId)
            );

            // Convert to regular players
            const players = aiPlayers.map((ai) => ai.toPlayer());

            // Verify all players have unique IDs
            const playerIds = players.map((p) => p.id);
            const uniqueIds = new Set(playerIds);
            expect(uniqueIds.size).toBe(players.length);

            // Verify all players are identifiable as AI
            players.forEach((player) => {
              expect(player.metadata?.isAI).toBe(true);
              expect(player.metadata?.strategyId).toBeDefined();
            });

            // Verify AI players maintain their individual properties
            aiPlayers.forEach((aiPlayer, index) => {
              const player = players[index];
              expect(player.id).toBe(aiPlayer.id);
              expect(player.metadata?.strategyId).toBe(aiPlayer.strategyId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: AI player validation should reject invalid inputs
     * This ensures proper error handling for malformed AI player data
     */
    it('should validate AI player construction parameters', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            id: fc.option(fc.string(), { nil: '' }),
            name: fc.option(fc.string(), { nil: '' }),
            gameType: fc.option(fc.string(), { nil: '' }),
            strategyId: fc.option(fc.string(), { nil: '' }),
          }),
          (invalidData) => {
            // Test that empty or invalid required fields throw errors
            if (
              !invalidData.id ||
              invalidData.id.trim() === '' ||
              !invalidData.name ||
              invalidData.name.trim() === '' ||
              !invalidData.gameType ||
              invalidData.gameType.trim() === '' ||
              !invalidData.strategyId ||
              invalidData.strategyId.trim() === ''
            ) {
              expect(() => {
                new AIPlayer(
                  invalidData.id || '',
                  invalidData.name || '',
                  invalidData.gameType || '',
                  invalidData.strategyId || ''
                );
              }).toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
