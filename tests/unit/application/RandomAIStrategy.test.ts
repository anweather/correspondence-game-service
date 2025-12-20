import { RandomAIStrategy } from '@application/ai/RandomAIStrategy';
import { GameState, Move, GameLifecycle } from '@domain/models';
import { ValidationResult } from '@domain/interfaces';
import { MockGameEngine } from '../../utils';

// Mock game engine for testing RandomAIStrategy
class TestGameEngine extends MockGameEngine {
  private validationResults: Map<string, ValidationResult> = new Map();

  constructor(gameType: string = 'test-game') {
    super(gameType);
  }

  setValidationResult(moveKey: string, result: ValidationResult): void {
    this.validationResults.set(moveKey, result);
  }

  validateMove(state: GameState, _playerId: string, move: Move): ValidationResult {
    // Create a key for this specific move
    const moveKey = `${move.action}-${JSON.stringify(move.parameters)}`;

    // Return specific validation result if set
    if (this.validationResults.has(moveKey)) {
      return this.validationResults.get(moveKey)!;
    }

    // Default validation logic for testing
    if (
      move.action === 'place' &&
      move.parameters.row !== undefined &&
      move.parameters.col !== undefined
    ) {
      const { row, col } = move.parameters;
      // Valid if within bounds and space is empty
      if (row >= 0 && row < 3 && col >= 0 && col < 3) {
        const spaceId = `${row},${col}`;
        const space = state.board.spaces.find((s) => s.id === spaceId);
        return { valid: space ? space.tokens.length === 0 : false };
      }
    }

    return { valid: false, reason: 'Invalid move' };
  }
}

describe('RandomAIStrategy', () => {
  let strategy: RandomAIStrategy;
  let gameEngine: TestGameEngine;
  let gameState: GameState;

  beforeEach(() => {
    gameEngine = new TestGameEngine();
    strategy = new RandomAIStrategy(gameEngine);

    // Create a basic 3x3 game state for testing
    gameState = {
      gameId: 'test-game-123',
      gameType: 'test-game',
      lifecycle: GameLifecycle.ACTIVE,
      players: [
        { id: 'ai-player-1', name: 'AI Player', joinedAt: new Date(), metadata: { isAI: true } },
      ],
      currentPlayerIndex: 0,
      phase: 'playing',
      board: {
        spaces: [
          { id: '0,0', position: { x: 0, y: 0 }, tokens: [] },
          { id: '0,1', position: { x: 0, y: 1 }, tokens: [] },
          { id: '0,2', position: { x: 0, y: 2 }, tokens: [] },
          { id: '1,0', position: { x: 1, y: 0 }, tokens: [] },
          { id: '1,1', position: { x: 1, y: 1 }, tokens: [] },
          { id: '1,2', position: { x: 1, y: 2 }, tokens: [] },
          { id: '2,0', position: { x: 2, y: 0 }, tokens: [] },
          { id: '2,1', position: { x: 2, y: 1 }, tokens: [] },
          { id: '2,2', position: { x: 2, y: 2 }, tokens: [] },
        ],
        metadata: {},
      },
      moveHistory: [],
      metadata: {},
      winner: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('Strategy Properties', () => {
    it('should have correct strategy metadata', () => {
      expect(strategy.id).toBe('random');
      expect(strategy.name).toBe('Random AI');
      expect(strategy.description).toBe('Selects random valid moves from available options');
      expect(strategy.difficulty).toBe('easy');
    });

    it('should have appropriate time limit', () => {
      expect(strategy.getTimeLimit()).toBe(500);
    });

    it('should validate any configuration', () => {
      expect(strategy.validateConfiguration({})).toBe(true);
      expect(strategy.validateConfiguration({ any: 'config' })).toBe(true);
      expect(strategy.validateConfiguration({ complex: { nested: 'value' } })).toBe(true);
    });
  });

  describe('Move Generation', () => {
    it('should generate a valid move from available options', async () => {
      const aiPlayerId = 'ai-player-1';

      const move = await strategy.generateMove(gameState, aiPlayerId);

      expect(move).toBeDefined();
      expect(move.playerId).toBe(aiPlayerId);
      expect(move.timestamp).toBeInstanceOf(Date);
      expect(move.action).toBe('place');
      expect(move.parameters).toBeDefined();
      expect(move.parameters.row).toBeGreaterThanOrEqual(0);
      expect(move.parameters.row).toBeLessThan(3);
      expect(move.parameters.col).toBeGreaterThanOrEqual(0);
      expect(move.parameters.col).toBeLessThan(3);

      // Verify the move is valid according to the game engine
      const validation = gameEngine.validateMove(gameState, aiPlayerId, move);
      expect(validation.valid).toBe(true);
    });

    it('should generate different moves on multiple calls (randomness)', async () => {
      const aiPlayerId = 'ai-player-1';
      const moves: Move[] = [];

      // Generate multiple moves
      for (let i = 0; i < 10; i++) {
        const move = await strategy.generateMove(gameState, aiPlayerId);
        moves.push(move);
      }

      // Check that we got some variety (not all moves are identical)
      const uniqueMoves = new Set(moves.map((m) => `${m.parameters.row},${m.parameters.col}`));
      expect(uniqueMoves.size).toBeGreaterThan(1); // Should have some variety
    });

    it('should only generate moves for empty spaces', async () => {
      const aiPlayerId = 'ai-player-1';

      // Occupy some spaces
      gameState.board.spaces[0].tokens = [{ id: 'token-1', type: 'X', ownerId: 'player-1' }];
      gameState.board.spaces[4].tokens = [{ id: 'token-2', type: 'O', ownerId: 'player-2' }];

      const move = await strategy.generateMove(gameState, aiPlayerId);

      // Verify the move is for an empty space
      const spaceId = `${move.parameters.row},${move.parameters.col}`;
      const targetSpace = gameState.board.spaces.find((s) => s.id === spaceId);
      expect(targetSpace).toBeDefined();
      expect(targetSpace!.tokens.length).toBe(0);
    });

    it('should handle board with only one empty space', async () => {
      const aiPlayerId = 'ai-player-1';

      // Occupy all spaces except one
      for (let i = 0; i < gameState.board.spaces.length - 1; i++) {
        gameState.board.spaces[i].tokens = [{ id: `token-${i}`, type: 'X', ownerId: 'player-1' }];
      }

      const move = await strategy.generateMove(gameState, aiPlayerId);

      // Should generate move for the last empty space
      expect(move.parameters.row).toBe(2);
      expect(move.parameters.col).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no valid moves are available', async () => {
      const aiPlayerId = 'ai-player-1';

      // Occupy all spaces
      gameState.board.spaces.forEach((space, index) => {
        space.tokens = [{ id: `token-${index}`, type: 'X', ownerId: 'player-1' }];
      });

      await expect(strategy.generateMove(gameState, aiPlayerId)).rejects.toThrow(
        `No valid moves available for AI player ${aiPlayerId}`
      );
    });

    it('should handle empty board gracefully', async () => {
      const aiPlayerId = 'ai-player-1';

      // Empty board (no spaces)
      gameState.board.spaces = [];

      await expect(strategy.generateMove(gameState, aiPlayerId)).rejects.toThrow(
        `No valid moves available for AI player ${aiPlayerId}`
      );
    });

    it('should handle invalid space IDs gracefully', async () => {
      const aiPlayerId = 'ai-player-1';

      // Create board with unparseable space IDs
      gameState.board.spaces = [
        { id: 'invalid-id', position: { x: 0, y: 0 }, tokens: [] },
        { id: 'another-invalid', position: { x: 1, y: 1 }, tokens: [] },
      ];

      await expect(strategy.generateMove(gameState, aiPlayerId)).rejects.toThrow(
        `No valid moves available for AI player ${aiPlayerId}`
      );
    });
  });

  describe('Space ID Parsing', () => {
    it('should parse standard row,col format', async () => {
      const aiPlayerId = 'ai-player-1';

      // Create board with standard format
      gameState.board.spaces = [{ id: '1,2', position: { x: 1, y: 2 }, tokens: [] }];

      const move = await strategy.generateMove(gameState, aiPlayerId);
      expect(move.parameters.row).toBe(1);
      expect(move.parameters.col).toBe(2);
    });

    it('should handle numeric space IDs', async () => {
      const aiPlayerId = 'ai-player-1';

      // Create board with numeric IDs
      gameState.board.spaces = [{ id: '5', position: { x: 0, y: 0 }, tokens: [] }];

      // Override validation to accept position-based moves
      gameEngine.setValidationResult('place-{"position":5}', { valid: true });

      const move = await strategy.generateMove(gameState, aiPlayerId);
      expect(move.parameters.position).toBe(5);
    });
  });

  describe('Integration with Game Engine', () => {
    it('should respect game engine validation', async () => {
      const aiPlayerId = 'ai-player-1';

      // Set up game engine to reject certain moves
      gameEngine.setValidationResult('place-{"row":0,"col":0}', {
        valid: false,
        reason: 'Test rejection',
      });
      gameEngine.setValidationResult('place-{"row":0,"col":1}', {
        valid: false,
        reason: 'Test rejection',
      });

      const move = await strategy.generateMove(gameState, aiPlayerId);

      // Should not generate the rejected moves
      expect(!(move.parameters.row === 0 && move.parameters.col === 0)).toBe(true);
      expect(!(move.parameters.row === 0 && move.parameters.col === 1)).toBe(true);

      // Verify the generated move is valid
      const validation = gameEngine.validateMove(gameState, aiPlayerId, move);
      expect(validation.valid).toBe(true);
    });

    it('should work with different game engines', () => {
      const differentEngine = new TestGameEngine('different-game');
      const differentStrategy = new RandomAIStrategy(differentEngine);

      expect(differentStrategy.id).toBe('random');
      expect(differentStrategy.name).toBe('Random AI');
      expect(typeof differentStrategy.generateMove).toBe('function');
    });
  });

  describe('Performance', () => {
    it('should generate moves quickly', async () => {
      const aiPlayerId = 'ai-player-1';

      const startTime = Date.now();
      await strategy.generateMove(gameState, aiPlayerId);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should be very fast for random selection
    });

    it('should handle large boards efficiently', async () => {
      const aiPlayerId = 'ai-player-1';

      // Create a larger board (10x10)
      const largeBoard = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          largeBoard.push({
            id: `${row},${col}`,
            position: { x: row, y: col },
            tokens: [],
          });
        }
      }
      gameState.board.spaces = largeBoard;

      const startTime = Date.now();
      const move = await strategy.generateMove(gameState, aiPlayerId);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should still be fast
      expect(move).toBeDefined();
    });
  });
});
