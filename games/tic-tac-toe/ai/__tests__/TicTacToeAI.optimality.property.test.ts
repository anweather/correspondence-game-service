import * as fc from 'fast-check';
import { PerfectPlayStrategy } from '../PerfectPlayStrategy';
import { GameState, Player, Move } from '@domain/models';
import { TicTacToeEngine } from '../../engine/TicTacToeEngine';
import { WIN_PATTERNS, BOARD_SIZE } from '../../shared/constants';
import { isSpaceOccupied } from '../../engine/validation';

/**
 * Property-based tests for Tic-Tac-Toe AI Optimality
 */
describe('Tic-Tac-Toe AI Optimality - Property-Based Tests', () => {
  describe('Property 9: Tic-Tac-Toe AI Optimality', () => {
    /**
     * **Feature: ai-player-system, Property 9: Tic-Tac-Toe AI Optimality**
     * **Validates: Requirements 6.2**
     *
     * Property: For any tic-tac-toe game state, the perfect-play AI strategy should never make 
     * a suboptimal move when winning or blocking moves are available
     *
     * This property ensures that:
     * 1. AI takes immediate wins when available
     * 2. AI blocks opponent wins when no winning move is available
     * 3. AI follows optimal positioning strategy (center > corners > edges)
     * 4. AI never makes moves that allow opponent to win unnecessarily
     */
    it('should never make suboptimal moves when winning or blocking moves are available', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate game states with various board configurations
          fc.record({
            // Generate board state by specifying which positions are filled and by whom
            boardState: fc.array(
              fc.record({
                row: fc.integer({ min: 0, max: BOARD_SIZE - 1 }),
                col: fc.integer({ min: 0, max: BOARD_SIZE - 1 }),
                tokenType: fc.constantFrom('X', 'O')
              }),
              { minLength: 0, maxLength: 8 } // Max 8 moves (9th would end game)
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
            aiPlayerIndex: fc.constantFrom(0, 1), // AI is either player 0 (X) or player 1 (O)
          }),
          async (config) => {
            // Skip if board would be full or game already over
            if (config.boardState.length >= 9) {
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
            const aiTokenType = config.aiPlayerIndex === 0 ? 'X' : 'O';
            const opponentTokenType = aiTokenType === 'X' ? 'O' : 'X';

            // Skip if it's not the AI's turn
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            if (currentPlayer.id !== aiPlayerId) {
              return;
            }

            // Generate AI move
            const strategy = new PerfectPlayStrategy();
            const aiMove = await strategy.generateMove(gameState, aiPlayerId);

            // Verify the move is valid
            const validation = engine.validateMove(gameState, aiPlayerId, aiMove);
            expect(validation.valid).toBe(true);

            // Check optimality conditions
            const { row, col } = aiMove.parameters as { row: number; col: number };

            // Property 1: If AI can win immediately, it must take the winning move
            const winningMoves = findWinningMoves(gameState, aiTokenType);
            if (winningMoves.length > 0) {
              const aiMoveIsWinning = winningMoves.some(
                move => move.row === row && move.col === col
              );
              expect(aiMoveIsWinning).toBe(true);
              return; // If winning move available, that's optimal
            }

            // Property 2: If opponent can win next turn, AI must block
            const blockingMoves = findWinningMoves(gameState, opponentTokenType);
            if (blockingMoves.length > 0) {
              const aiMoveIsBlocking = blockingMoves.some(
                move => move.row === row && move.col === col
              );
              expect(aiMoveIsBlocking).toBe(true);
              return; // If blocking move required, that's optimal
            }

            // Property 3: If no immediate win/block needed, verify strategic positioning
            // Center is preferred, then corners, then edges
            const movePosition = { row, col };
            
            // If center is available, AI should prefer it
            if (!isSpaceOccupied(gameState, 1, 1)) {
              expect(movePosition.row === 1 && movePosition.col === 1).toBe(true);
              return;
            }

            // If center is taken, corners are preferred over edges
            const corners = [
              { row: 0, col: 0 }, { row: 0, col: 2 },
              { row: 2, col: 0 }, { row: 2, col: 2 }
            ];
            const edges = [
              { row: 0, col: 1 }, { row: 1, col: 0 },
              { row: 1, col: 2 }, { row: 2, col: 1 }
            ];

            const availableCorners = corners.filter(
              corner => !isSpaceOccupied(gameState, corner.row, corner.col)
            );
            const availableEdges = edges.filter(
              edge => !isSpaceOccupied(gameState, edge.row, edge.col)
            );

            // If corners are available, AI should not choose edges
            if (availableCorners.length > 0) {
              const aiChoseEdge = availableEdges.some(
                edge => edge.row === row && edge.col === col
              );
              expect(aiChoseEdge).toBe(false);
            }

            // Property 4: AI move should not create an immediate win opportunity for opponent
            // (unless it's the only move available)
            const availableMoves = getAllAvailableMoves(gameState);
            if (availableMoves.length > 1) {
              // Apply AI move and check if opponent can win immediately
              const tempState = engine.applyMove(gameState, aiPlayerId, aiMove);
              const opponentWinningMoves = findWinningMoves(tempState, opponentTokenType);
              
              // If this move creates opponent winning opportunities, 
              // verify no other move would be better
              if (opponentWinningMoves.length > 0) {
                // Check if any other available move would not create opponent wins
                let betterMoveExists = false;
                for (const altMove of availableMoves) {
                  if (altMove.row === row && altMove.col === col) continue;
                  
                  const altMoveObj: Move = {
                    playerId: aiPlayerId,
                    action: 'place',
                    parameters: { row: altMove.row, col: altMove.col },
                    timestamp: new Date()
                  };
                  
                  const altTempState = engine.applyMove(gameState, aiPlayerId, altMoveObj);
                  const altOpponentWins = findWinningMoves(altTempState, opponentTokenType);
                  
                  if (altOpponentWins.length === 0) {
                    betterMoveExists = true;
                    break;
                  }
                }
                
                // If a better move exists, AI should not have chosen the current move
                expect(betterMoveExists).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Find all moves that would result in an immediate win for the given token type
 */
function findWinningMoves(state: GameState, tokenType: string): { row: number; col: number }[] {
  const winningMoves: { row: number; col: number }[] = [];

  for (const pattern of WIN_PATTERNS) {
    const spaces = pattern.map(id => {
      const space = state.board.spaces.find(s => s.id === id);
      return {
        id,
        hasToken: space && space.tokens.length > 0,
        tokenType: space && space.tokens.length > 0 ? space.tokens[0].type : null
      };
    });

    // Check if pattern has exactly 2 of our tokens and 1 empty space
    const ourTokens = spaces.filter(s => s.tokenType === tokenType).length;
    const emptySpaces = spaces.filter(s => !s.hasToken);

    if (ourTokens === 2 && emptySpaces.length === 1) {
      const emptySpaceId = emptySpaces[0].id;
      const [row, col] = emptySpaceId.split(',').map(Number);
      winningMoves.push({ row, col });
    }
  }

  return winningMoves;
}

/**
 * Get all available moves on the board
 */
function getAllAvailableMoves(state: GameState): { row: number; col: number }[] {
  const availableMoves: { row: number; col: number }[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!isSpaceOccupied(state, row, col)) {
        availableMoves.push({ row, col });
      }
    }
  }

  return availableMoves;
}