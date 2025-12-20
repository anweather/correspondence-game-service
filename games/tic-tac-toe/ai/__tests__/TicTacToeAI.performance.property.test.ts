import * as fc from 'fast-check';
import { PerfectPlayStrategy, EasyStrategy } from '../';
import { Player, Move } from '@domain/models';
import { TicTacToeEngine } from '../../engine/TicTacToeEngine';
import { BOARD_SIZE } from '../../shared/constants';

/**
 * Property-based tests for Tic-Tac-Toe AI Performance
 */
describe('Tic-Tac-Toe AI Performance - Property-Based Tests', () => {
  describe('Property 10: AI Performance Requirements', () => {
    /**
     * **Feature: ai-player-system, Property 10: AI Performance Requirements**
     * **Validates: Requirements 6.4**
     *
     * Property: For any AI move generation in tic-tac-toe, the move should be generated 
     * and applied within 1 second
     *
     * This property ensures that:
     * 1. Perfect play strategy generates moves within 1 second
     * 2. Easy strategy generates moves within 1 second
     * 3. Performance is consistent across different board states
     * 4. AI strategies meet the responsiveness requirements
     */
    it('should generate moves within 1 second for all strategies and board states', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various board configurations
          fc.record({
            boardState: fc.array(
              fc.record({
                row: fc.integer({ min: 0, max: BOARD_SIZE - 1 }),
                col: fc.integer({ min: 0, max: BOARD_SIZE - 1 }),
                tokenType: fc.constantFrom('X', 'O')
              }),
              { minLength: 0, maxLength: 7 } // Leave at least 2 spaces for moves
            ).map(moves => {
              // Remove duplicates (same position)
              const uniqueMoves = [];
              const seenPositions = new Set();
              for (const move of moves) {
                const posKey = `${move.row},${move.col}`;
                if (!seenPositions.has(posKey)) {
                  seenPositions.add(posKey);
                  uniqueMoves.push(move);
                }
              }
              return uniqueMoves;
            }),
            aiPlayerIndex: fc.constantFrom(0, 1),
            strategyType: fc.constantFrom('perfect', 'easy')
          }),
          async (config) => {
            // Skip if board would be too full
            if (config.boardState.length >= 8) {
              return;
            }

            // Create game state
            const engine = new TicTacToeEngine();
            const players: Player[] = [
              { id: 'player1', name: 'Player 1', joinedAt: new Date() },
              { id: 'player2', name: 'Player 2', joinedAt: new Date() }
            ];

            let gameState = engine.initializeGame(players, {});

            // Apply the generated moves to create the board state
            for (const move of config.boardState) {
              const playerId = move.tokenType === 'X' ? players[0].id : players[1].id;
              const moveObj: Move = {
                playerId,
                action: 'place',
                parameters: { row: move.row, col: move.col },
                timestamp: new Date()
              };

              // Only apply if move is valid and game isn't over
              const validation = engine.validateMove(gameState, playerId, moveObj);
              if (validation.valid && !engine.isGameOver(gameState)) {
                gameState = engine.applyMove(gameState, playerId, moveObj);
              }
            }

            // Skip if game is already over
            if (engine.isGameOver(gameState)) {
              return;
            }

            // Determine AI player details
            const aiPlayerId = players[config.aiPlayerIndex].id;

            // Skip if it's not the AI's turn
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            if (currentPlayer.id !== aiPlayerId) {
              return;
            }

            // Select strategy based on config
            const strategy = config.strategyType === 'perfect' 
              ? new PerfectPlayStrategy() 
              : new EasyStrategy();

            // Measure performance
            const startTime = performance.now();
            
            try {
              const aiMove = await strategy.generateMove(gameState, aiPlayerId);
              const endTime = performance.now();
              const duration = endTime - startTime;

              // Property 1: Move generation should complete within 1 second (1000ms)
              expect(duration).toBeLessThan(1000);

              // Property 2: Move should be valid
              const validation = engine.validateMove(gameState, aiPlayerId, aiMove);
              expect(validation.valid).toBe(true);

              // Property 3: Strategy-specific performance expectations
              if (config.strategyType === 'perfect') {
                // Perfect play should be reasonably fast (within 500ms as per strategy spec)
                expect(duration).toBeLessThan(500);
              } else {
                // Easy strategy should be very fast (within 100ms as per strategy spec)
                expect(duration).toBeLessThan(100);
              }

              // Property 4: Move should have correct structure
              expect(aiMove).toBeDefined();
              expect(aiMove.action).toBe('place');
              expect(aiMove.parameters).toBeDefined();
              expect(typeof aiMove.parameters.row).toBe('number');
              expect(typeof aiMove.parameters.col).toBe('number');
              expect(aiMove.parameters.row).toBeGreaterThanOrEqual(0);
              expect(aiMove.parameters.row).toBeLessThan(BOARD_SIZE);
              expect(aiMove.parameters.col).toBeGreaterThanOrEqual(0);
              expect(aiMove.parameters.col).toBeLessThan(BOARD_SIZE);

            } catch (error) {
              const endTime = performance.now();
              const duration = endTime - startTime;
              
              // Even if there's an error, it should happen quickly
              expect(duration).toBeLessThan(1000);
              
              // Re-throw to fail the test if there's an unexpected error
              throw error;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test performance under stress conditions (nearly full boards)
     */
    it('should maintain performance even with nearly full boards', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            strategyType: fc.constantFrom('perfect', 'easy'),
            aiPlayerIndex: fc.constantFrom(0, 1)
          }),
          async (config) => {
            // Create a nearly full board (7 moves, leaving 2 spaces)
            const engine = new TicTacToeEngine();
            const players: Player[] = [
              { id: 'player1', name: 'Player 1', joinedAt: new Date() },
              { id: 'player2', name: 'Player 2', joinedAt: new Date() }
            ];

            let gameState = engine.initializeGame(players, {});

            // Fill most of the board alternating between X and O
            const moves = [
              { row: 0, col: 0, tokenType: 'X' },
              { row: 0, col: 1, tokenType: 'O' },
              { row: 0, col: 2, tokenType: 'X' },
              { row: 1, col: 0, tokenType: 'O' },
              { row: 1, col: 2, tokenType: 'X' },
              { row: 2, col: 0, tokenType: 'O' },
              { row: 2, col: 2, tokenType: 'X' }
            ];

            for (const move of moves) {
              const playerId = move.tokenType === 'X' ? players[0].id : players[1].id;
              const moveObj: Move = {
                playerId,
                action: 'place',
                parameters: { row: move.row, col: move.col },
                timestamp: new Date()
              };

              if (!engine.isGameOver(gameState)) {
                gameState = engine.applyMove(gameState, playerId, moveObj);
              }
            }

            // Skip if game is over
            if (engine.isGameOver(gameState)) {
              return;
            }

            const aiPlayerId = players[config.aiPlayerIndex].id;
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            
            // Skip if it's not the AI's turn
            if (currentPlayer.id !== aiPlayerId) {
              return;
            }

            const strategy = config.strategyType === 'perfect' 
              ? new PerfectPlayStrategy() 
              : new EasyStrategy();

            // Measure performance on nearly full board
            const startTime = performance.now();
            const aiMove = await strategy.generateMove(gameState, aiPlayerId);
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should still be fast even with complex board state
            expect(duration).toBeLessThan(1000);
            
            // Strategy-specific performance expectations should still hold
            if (config.strategyType === 'perfect') {
              expect(duration).toBeLessThan(500);
            } else {
              expect(duration).toBeLessThan(100);
            }

            // Move should be valid
            const validation = engine.validateMove(gameState, aiPlayerId, aiMove);
            expect(validation.valid).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});