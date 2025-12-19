import * as fc from 'fast-check';
import { InMemoryAIPlayerRepository } from '../../../src/infrastructure/persistence/InMemoryAIPlayerRepository';
import {
  CreateAIPlayerParams,
  UpdateAIPlayerParams,
} from '../../../src/domain/interfaces/IAIPlayerRepository';

/**
 * Property-based tests for InMemoryAIPlayerRepository
 * These tests verify universal properties that should hold across all inputs
 */
describe('InMemoryAIPlayerRepository - Property-Based Tests', () => {
  describe('Property 7: AI Player Persistence', () => {
    /**
     * **Feature: ai-player-system, Property 7: AI Player Persistence**
     * **Validates: Requirements 4.5**
     *
     * Property: For any game with AI players, saving and loading the game should preserve
     * all AI player state and configuration data
     *
     * This property ensures that:
     * 1. AI players can be created and stored
     * 2. AI players can be retrieved with all their data intact
     * 3. AI player updates preserve data integrity
     * 4. AI player queries work correctly across different filters
     */
    it('should preserve AI player data through create and retrieve operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary AI player creation parameters
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            gameType: fc.constantFrom('tic-tac-toe', 'connect-four', 'chess', 'checkers'),
            strategyId: fc.constantFrom('random', 'easy', 'medium', 'hard', 'perfect'),
            difficulty: fc.option(fc.constantFrom('easy', 'medium', 'hard'), { nil: undefined }),
            configuration: fc.option(
              fc.record({
                timeout: fc.integer({ min: 100, max: 5000 }),
                maxDepth: fc.integer({ min: 1, max: 10 }),
                aggressive: fc.boolean(),
              }),
              { nil: undefined }
            ),
          }),
          async (createParams: CreateAIPlayerParams) => {
            // Create fresh repository for each test run
            const repository = new InMemoryAIPlayerRepository();
            // Create AI player
            const createdAIPlayer = await repository.create(createParams);

            // Verify AI player was created with correct data
            expect(createdAIPlayer.id).toBeDefined();
            expect(createdAIPlayer.name).toBe(createParams.name);
            expect(createdAIPlayer.gameType).toBe(createParams.gameType);
            expect(createdAIPlayer.strategyId).toBe(createParams.strategyId);
            expect(createdAIPlayer.difficulty).toBe(createParams.difficulty);
            expect(createdAIPlayer.configuration).toEqual(createParams.configuration);
            expect(createdAIPlayer.createdAt).toBeInstanceOf(Date);

            // Retrieve AI player by ID
            const retrievedAIPlayer = await repository.findById(createdAIPlayer.id);

            // Verify all data is preserved
            expect(retrievedAIPlayer).not.toBeNull();
            expect(retrievedAIPlayer!.id).toBe(createdAIPlayer.id);
            expect(retrievedAIPlayer!.name).toBe(createdAIPlayer.name);
            expect(retrievedAIPlayer!.gameType).toBe(createdAIPlayer.gameType);
            expect(retrievedAIPlayer!.strategyId).toBe(createdAIPlayer.strategyId);
            expect(retrievedAIPlayer!.difficulty).toBe(createdAIPlayer.difficulty);
            expect(retrievedAIPlayer!.configuration).toEqual(createdAIPlayer.configuration);
            expect(retrievedAIPlayer!.createdAt).toEqual(createdAIPlayer.createdAt);

            // Verify AI player exists
            const exists = await repository.exists(createdAIPlayer.id);
            expect(exists).toBe(true);

            // Verify AI player can be found by game type
            const aiPlayersByGameType = await repository.findByGameType(createParams.gameType);
            expect(aiPlayersByGameType).toContainEqual(createdAIPlayer);

            // Verify AI player can be found by strategy ID
            const aiPlayersByStrategy = await repository.findByStrategyId(createParams.strategyId);
            expect(aiPlayersByStrategy).toContainEqual(createdAIPlayer);

            // Verify AI player appears in findAll results
            const allAIPlayers = await repository.findAll();
            expect(allAIPlayers).toContainEqual(createdAIPlayer);

            // Verify filtered queries work correctly
            const filteredAIPlayers = await repository.findAll({
              gameType: createParams.gameType,
              strategyId: createParams.strategyId,
              difficulty: createParams.difficulty,
            });
            expect(filteredAIPlayers).toContainEqual(createdAIPlayer);

            // Verify count by game type
            const countBefore = await repository.countByGameType(createParams.gameType);
            expect(countBefore).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property: AI player updates should preserve data integrity
     * This ensures that updating AI players maintains consistency
     */
    it('should preserve data integrity through update operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial AI player data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            gameType: fc.constantFrom('tic-tac-toe', 'connect-four'),
            strategyId: fc.constantFrom('random', 'easy', 'hard'),
            difficulty: fc.option(fc.constantFrom('easy', 'medium', 'hard'), { nil: undefined }),
            configuration: fc.option(
              fc.record({
                timeout: fc.integer({ min: 100, max: 5000 }),
              }),
              { nil: undefined }
            ),
          }),
          // Generate update parameters
          fc.record({
            name: fc.option(
              fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
              { nil: undefined }
            ),
            strategyId: fc.option(fc.constantFrom('random', 'easy', 'hard'), { nil: undefined }),
            difficulty: fc.option(fc.constantFrom('easy', 'medium', 'hard'), { nil: undefined }),
            configuration: fc.option(
              fc.record({
                timeout: fc.integer({ min: 100, max: 5000 }),
                maxDepth: fc.integer({ min: 1, max: 10 }),
              }),
              { nil: undefined }
            ),
          }),
          async (createParams: CreateAIPlayerParams, updateParams: UpdateAIPlayerParams) => {
            // Create fresh repository for each test run
            const repository = new InMemoryAIPlayerRepository();
            // Create initial AI player
            const originalAIPlayer = await repository.create(createParams);

            // Update AI player
            const updatedAIPlayer = await repository.update(originalAIPlayer.id, updateParams);

            // Verify update preserved ID and creation date
            expect(updatedAIPlayer.id).toBe(originalAIPlayer.id);
            expect(updatedAIPlayer.createdAt).toEqual(originalAIPlayer.createdAt);

            // Verify updated fields
            expect(updatedAIPlayer.name).toBe(updateParams.name ?? originalAIPlayer.name);
            expect(updatedAIPlayer.strategyId).toBe(
              updateParams.strategyId ?? originalAIPlayer.strategyId
            );
            expect(updatedAIPlayer.difficulty).toBe(
              updateParams.difficulty ?? originalAIPlayer.difficulty
            );
            expect(updatedAIPlayer.configuration).toEqual(
              updateParams.configuration ?? originalAIPlayer.configuration
            );

            // Verify game type cannot be changed
            expect(updatedAIPlayer.gameType).toBe(originalAIPlayer.gameType);

            // Verify updated AI player can be retrieved
            const retrievedUpdatedAIPlayer = await repository.findById(originalAIPlayer.id);
            expect(retrievedUpdatedAIPlayer).toEqual(updatedAIPlayer);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: AI player deletion should maintain repository consistency
     * This ensures that deleting AI players works correctly
     */
    it('should maintain consistency through delete operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            gameType: fc.constantFrom('tic-tac-toe', 'connect-four'),
            strategyId: fc.constantFrom('random', 'easy', 'hard'),
          }),
          async (createParams: CreateAIPlayerParams) => {
            // Create fresh repository for each test run
            const repository = new InMemoryAIPlayerRepository();
            // Create AI player
            const aiPlayer = await repository.create(createParams);

            // Verify AI player exists
            expect(await repository.exists(aiPlayer.id)).toBe(true);
            expect(await repository.findById(aiPlayer.id)).not.toBeNull();

            // Delete AI player
            await repository.delete(aiPlayer.id);

            // Verify AI player no longer exists
            expect(await repository.exists(aiPlayer.id)).toBe(false);
            expect(await repository.findById(aiPlayer.id)).toBeNull();

            // Verify AI player is not in query results
            const allAIPlayers = await repository.findAll();
            expect(allAIPlayers).not.toContainEqual(aiPlayer);

            const aiPlayersByGameType = await repository.findByGameType(createParams.gameType);
            expect(aiPlayersByGameType).not.toContainEqual(aiPlayer);

            const aiPlayersByStrategy = await repository.findByStrategyId(createParams.strategyId);
            expect(aiPlayersByStrategy).not.toContainEqual(aiPlayer);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Repository operations should handle multiple AI players correctly
     * This ensures that the repository can manage multiple AI players simultaneously
     */
    it('should handle multiple AI players correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple AI player configurations
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
              gameType: fc.constantFrom('tic-tac-toe', 'connect-four'),
              strategyId: fc.constantFrom('random', 'easy', 'hard'),
              difficulty: fc.option(fc.constantFrom('easy', 'medium', 'hard'), { nil: undefined }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (aiPlayerConfigs: CreateAIPlayerParams[]) => {
            // Create fresh repository for each test run
            const repository = new InMemoryAIPlayerRepository();
            // Create all AI players
            const createdAIPlayers = [];
            for (const config of aiPlayerConfigs) {
              const aiPlayer = await repository.create(config);
              createdAIPlayers.push(aiPlayer);
            }

            // Verify all AI players exist
            for (const aiPlayer of createdAIPlayers) {
              expect(await repository.exists(aiPlayer.id)).toBe(true);
              const retrieved = await repository.findById(aiPlayer.id);
              expect(retrieved).toEqual(aiPlayer);
            }

            // Verify findAll returns all created AI players
            const allAIPlayers = await repository.findAll();
            for (const aiPlayer of createdAIPlayers) {
              expect(allAIPlayers).toContainEqual(aiPlayer);
            }

            // Verify game type filtering works with multiple players
            const gameTypes = [...new Set(aiPlayerConfigs.map((config) => config.gameType))];
            for (const gameType of gameTypes) {
              const expectedCount = aiPlayerConfigs.filter(
                (config) => config.gameType === gameType
              ).length;
              const actualCount = await repository.countByGameType(gameType);
              expect(actualCount).toBe(expectedCount);

              const aiPlayersByGameType = await repository.findByGameType(gameType);
              expect(aiPlayersByGameType.length).toBe(expectedCount);
            }

            // Verify strategy filtering works with multiple players
            const strategyIds = [...new Set(aiPlayerConfigs.map((config) => config.strategyId))];
            for (const strategyId of strategyIds) {
              const expectedAIPlayers = createdAIPlayers.filter(
                (aiPlayer) => aiPlayer.strategyId === strategyId
              );
              const aiPlayersByStrategy = await repository.findByStrategyId(strategyId);
              expect(aiPlayersByStrategy.length).toBe(expectedAIPlayers.length);
              for (const expectedAIPlayer of expectedAIPlayers) {
                expect(aiPlayersByStrategy).toContainEqual(expectedAIPlayer);
              }
            }
          }
        ),
        { numRuns: 50 } // Fewer runs for this more complex test
      );
    });

    /**
     * Property: Repository should handle error conditions correctly
     * This ensures proper error handling for invalid operations
     */
    it('should handle error conditions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (nonExistentId: string) => {
            // Create fresh repository for each test run
            const repository = new InMemoryAIPlayerRepository();
            // Verify operations on non-existent AI players throw errors
            await expect(
              repository.update(nonExistentId, { name: 'Updated Name' })
            ).rejects.toThrow();

            await expect(repository.delete(nonExistentId)).rejects.toThrow();

            // Verify queries on non-existent AI players return appropriate values
            expect(await repository.findById(nonExistentId)).toBeNull();
            expect(await repository.exists(nonExistentId)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Repository health check should always return true
     * This ensures the in-memory repository is always healthy
     */
    it('should always be healthy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No input needed
          async () => {
            // Create fresh repository for each test run
            const repository = new InMemoryAIPlayerRepository();
            const isHealthy = await repository.healthCheck();
            expect(isHealthy).toBe(true);
          }
        ),
        { numRuns: 10 } // Simple test, fewer runs needed
      );
    });
  });
});
