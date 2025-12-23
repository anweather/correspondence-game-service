/**
 * Unit tests for Yahtzee validation module
 * Tests dice roll move validation, scoring move validation, turn order validation,
 * and ValidationResult object structure
 * Requirements: 2.2, 2.4, 3.4, 6.2
 */

import { validateMove } from '../validation';
import { GameState, Player, GameLifecycle } from '@domain/models';
import { ValidationResult } from '@domain/interfaces';
import { YahtzeeMove, YahtzeeMetadata, YahtzeeCategory, Scorecard } from '../../shared/types';
import { MAX_ROLLS_PER_TURN } from '../../shared/constants';

describe('Yahtzee Validation Module', () => {
  let gameState: GameState<YahtzeeMetadata>;
  let players: Player[];

  beforeEach(() => {
    // Create test players
    players = [
      { id: 'player1', name: 'Player 1', joinedAt: new Date() },
      { id: 'player2', name: 'Player 2', joinedAt: new Date() }
    ];

    // Create initial scorecard for each player
    const scorecard1: Scorecard = {
      playerId: 'player1',
      categories: new Map(),
      upperSectionTotal: 0,
      upperSectionBonus: 0,
      lowerSectionTotal: 0,
      grandTotal: 0
    };

    const scorecard2: Scorecard = {
      playerId: 'player2',
      categories: new Map(),
      upperSectionTotal: 0,
      upperSectionBonus: 0,
      lowerSectionTotal: 0,
      grandTotal: 0
    };

    // Initialize all categories as available (null)
    Object.values(YahtzeeCategory).forEach(category => {
      scorecard1.categories.set(category, null);
      scorecard2.categories.set(category, null);
    });

    // Create game state
    gameState = {
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
        scorecards: new Map([
          ['player1', scorecard1],
          ['player2', scorecard2]
        ]),
        currentDice: {
          values: [1, 2, 3, 4, 5],
          keptDice: [false, false, false, false, false]
        },
        rollCount: 1,
        gamePhase: 'rolling',
        rollHistory: [],
        randomSeed: 'test-seed'
      }
    };
  });

  describe('Dice Roll Move Validation', () => {
    it('should reject dice roll move when not player turn', () => {
      const rollMove: YahtzeeMove = {
        playerId: 'player2', // Not current player
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true, false, true]
        }
      };

      const result = validateMove(gameState, 'player2', rollMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not your turn');
    });

    it('should reject dice roll move when in scoring phase', () => {
      gameState.metadata.gamePhase = 'scoring';

      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true, false, true]
        }
      };

      const result = validateMove(gameState, 'player1', rollMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('scoring phase');
    });

    it('should reject dice roll move when max rolls exceeded', () => {
      gameState.metadata.rollCount = MAX_ROLLS_PER_TURN;

      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true, false, true]
        }
      };

      const result = validateMove(gameState, 'player1', rollMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('maximum rolls');
    });

    it('should reject dice roll move with invalid keepDice array length', () => {
      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true] // Wrong length
        }
      };

      const result = validateMove(gameState, 'player1', rollMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('keepDice array must have exactly 5 elements');
    });

    it('should accept valid dice roll move', () => {
      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true, false, true]
        }
      };

      const result = validateMove(gameState, 'player1', rollMove);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Scoring Move Validation', () => {
    beforeEach(() => {
      // Set game to scoring phase
      gameState.metadata.gamePhase = 'scoring';
      gameState.metadata.rollCount = 3;
    });

    it('should reject scoring move when not player turn', () => {
      const scoreMove: YahtzeeMove = {
        playerId: 'player2', // Not current player
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES
        }
      };

      const result = validateMove(gameState, 'player2', scoreMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not your turn');
    });

    it('should reject scoring move when in rolling phase', () => {
      gameState.metadata.gamePhase = 'rolling';

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES
        }
      };

      const result = validateMove(gameState, 'player1', scoreMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('rolling phase');
    });

    it('should reject scoring move for already used category', () => {
      // Mark category as used
      const scorecard = gameState.metadata.scorecards.get('player1')!;
      scorecard.categories.set(YahtzeeCategory.ONES, 3);

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES
        }
      };

      const result = validateMove(gameState, 'player1', scoreMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('already been used');
    });

    it('should reject scoring move with invalid category', () => {
      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: 'invalid-category' as YahtzeeCategory
        }
      };

      const result = validateMove(gameState, 'player1', scoreMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid category');
    });

    it('should accept valid scoring move', () => {
      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES
        }
      };

      const result = validateMove(gameState, 'player1', scoreMove);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Turn Order Validation', () => {
    it('should validate current player correctly', () => {
      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.players[0].id).toBe('player1');

      const validMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [false, false, false, false, false]
        }
      };

      const result = validateMove(gameState, 'player1', validMove);
      expect(result.valid).toBe(true);
    });

    it('should reject move from non-current player', () => {
      const invalidMove: YahtzeeMove = {
        playerId: 'player2',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [false, false, false, false, false]
        }
      };

      const result = validateMove(gameState, 'player2', invalidMove);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not your turn');
    });
  });

  describe('ValidationResult Object Structure', () => {
    it('should return ValidationResult with valid=true for valid moves', () => {
      const validMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true, false, true]
        }
      };

      const result: ValidationResult = validateMove(gameState, 'player1', validMove);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return ValidationResult with valid=false and reason for invalid moves', () => {
      const invalidMove: YahtzeeMove = {
        playerId: 'player2', // Wrong player
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true, false, true]
        }
      };

      const result: ValidationResult = validateMove(gameState, 'player2', invalidMove);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
      expect(result.valid).toBe(false);
      expect(typeof result.reason).toBe('string');
      expect(result.reason!.length).toBeGreaterThan(0);
    });

    it('should return consistent ValidationResult structure', () => {
      const moves = [
        {
          playerId: 'player1',
          timestamp: new Date(),
          action: 'roll' as const,
          parameters: { keepDice: [true, false, true, false, true] }
        },
        {
          playerId: 'player2',
          timestamp: new Date(),
          action: 'roll' as const,
          parameters: { keepDice: [false, false, false, false, false] }
        }
      ];

      moves.forEach(move => {
        const result = validateMove(gameState, move.playerId, move);
        
        expect(result).toHaveProperty('valid');
        expect(typeof result.valid).toBe('boolean');
        
        if (!result.valid) {
          expect(result).toHaveProperty('reason');
          expect(typeof result.reason).toBe('string');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing scorecard gracefully', () => {
      // Set game to scoring phase
      gameState.metadata.gamePhase = 'scoring';
      
      // Remove scorecard for player
      gameState.metadata.scorecards.delete('player1');

      const move: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES
        }
      };

      const result = validateMove(gameState, 'player1', move);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('scorecard not found');
    });

    it('should handle invalid move action', () => {
      const invalidMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'invalid-action',
        parameters: {}
      } as any;

      const result = validateMove(gameState, 'player1', invalidMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('invalid action');
    });

    it('should handle missing parameters', () => {
      const invalidMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll'
        // Missing parameters
      } as any;

      const result = validateMove(gameState, 'player1', invalidMove);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('missing parameters');
    });
  });
});