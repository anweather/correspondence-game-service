/**
 * Unit tests for Yahtzee rules module
 * Tests dice roll move application, scoring move application, turn advancement logic,
 * and game completion detection
 * Requirements: 2.1, 2.3, 3.1, 3.5, 1.5
 */

import { applyMove, isGameOver, getWinner } from '../rules';
import { GameState, Player, GameLifecycle } from '@domain/models';
import { YahtzeeMove, YahtzeeMetadata, YahtzeeCategory, Scorecard } from '../../shared/types';
import { MAX_ROLLS_PER_TURN, DICE_COUNT } from '../../shared/constants';

describe('Yahtzee Rules Module', () => {
  let gameState: GameState<YahtzeeMetadata>;
  let players: Player[];

  beforeEach(() => {
    // Create test players
    players = [
      { id: 'player1', name: 'Player 1', joinedAt: new Date() },
      { id: 'player2', name: 'Player 2', joinedAt: new Date() },
    ];

    // Create initial scorecard for each player
    const scorecard1: Scorecard = {
      playerId: 'player1',
      categories: new Map(),
      upperSectionTotal: 0,
      upperSectionBonus: 0,
      lowerSectionTotal: 0,
      grandTotal: 0,
    };

    const scorecard2: Scorecard = {
      playerId: 'player2',
      categories: new Map(),
      upperSectionTotal: 0,
      upperSectionBonus: 0,
      lowerSectionTotal: 0,
      grandTotal: 0,
    };

    // Initialize all categories as available (null)
    Object.values(YahtzeeCategory).forEach((category) => {
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
          ['player2', scorecard2],
        ]),
        currentDice: {
          values: [1, 2, 3, 4, 5],
          keptDice: [false, false, false, false, false],
        },
        rollCount: 1,
        gamePhase: 'rolling',
        rollHistory: [],
        randomSeed: 'test-seed-123',
      },
    };
  });

  describe('Dice Roll Move Application', () => {
    it('should apply dice roll move with selective re-rolling', () => {
      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, false, true, false, true], // Keep dice 0, 2, 4
        },
      };

      const newState = applyMove(gameState, 'player1', rollMove);

      // Should increment roll count
      expect(newState.metadata.rollCount).toBe(2);

      // Should preserve kept dice values
      expect(newState.metadata.currentDice.values[0]).toBe(1); // Kept
      expect(newState.metadata.currentDice.values[2]).toBe(3); // Kept
      expect(newState.metadata.currentDice.values[4]).toBe(5); // Kept

      // Should update keptDice array
      expect(newState.metadata.currentDice.keptDice).toEqual([true, false, true, false, true]);

      // Should add to roll history
      expect(newState.metadata.rollHistory).toHaveLength(1);
      expect(newState.metadata.rollHistory[0].rollNumber).toBe(2);
      expect(newState.metadata.rollHistory[0].keptDice).toEqual([true, false, true, false, true]);

      // Should remain in rolling phase if not max rolls
      expect(newState.metadata.gamePhase).toBe('rolling');

      // Should not advance player turn
      expect(newState.currentPlayerIndex).toBe(0);
    });

    it('should transition to scoring phase after max rolls', () => {
      gameState.metadata.rollCount = MAX_ROLLS_PER_TURN - 1; // One roll left

      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [false, false, false, false, false],
        },
      };

      const newState = applyMove(gameState, 'player1', rollMove);

      // Should reach max rolls
      expect(newState.metadata.rollCount).toBe(MAX_ROLLS_PER_TURN);

      // Should transition to scoring phase
      expect(newState.metadata.gamePhase).toBe('scoring');
    });

    it('should use DiceEngine with consistent seed for re-rolling', () => {
      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [true, true, true, true, false], // Only re-roll last die
        },
      };

      const newState1 = applyMove(gameState, 'player1', rollMove);
      const newState2 = applyMove(gameState, 'player1', rollMove);

      // Should produce same results with same seed and parameters
      expect(newState1.metadata.currentDice.values[4]).toBe(
        newState2.metadata.currentDice.values[4]
      );
    });

    it('should handle first roll of turn correctly', () => {
      gameState.metadata.rollCount = 0; // No rolls yet
      gameState.metadata.currentDice.values = [0, 0, 0, 0, 0]; // No dice rolled yet

      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [false, false, false, false, false], // Roll all dice
        },
      };

      const newState = applyMove(gameState, 'player1', rollMove);

      // Should increment roll count to 1
      expect(newState.metadata.rollCount).toBe(1);

      // Should roll all 5 dice
      expect(newState.metadata.currentDice.values).toHaveLength(DICE_COUNT);
      newState.metadata.currentDice.values.forEach((value: number) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      });

      // Should remain in rolling phase
      expect(newState.metadata.gamePhase).toBe('rolling');
    });
  });

  describe('Scoring Move Application', () => {
    beforeEach(() => {
      // Set up for scoring phase
      gameState.metadata.gamePhase = 'scoring';
      gameState.metadata.rollCount = 3;
      gameState.metadata.currentDice.values = [1, 1, 1, 2, 3]; // Three ones
    });

    it('should apply scoring move and update scorecard', () => {
      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES,
        },
      };

      const newState = applyMove(gameState, 'player1', scoreMove);

      // Should update scorecard with calculated score
      const scorecard = newState.metadata.scorecards.get('player1')!;
      expect(scorecard.categories.get(YahtzeeCategory.ONES)).toBe(3); // Three ones = 3 points

      // Should update totals
      expect(scorecard.upperSectionTotal).toBe(3);
      expect(scorecard.grandTotal).toBe(3);

      // Should advance to next player
      expect(newState.currentPlayerIndex).toBe(1);

      // Should reset for next turn
      expect(newState.metadata.rollCount).toBe(0);
      expect(newState.metadata.gamePhase).toBe('rolling');
      expect(newState.metadata.currentDice.keptDice).toEqual([false, false, false, false, false]);

      // Should add move to history
      expect(newState.moveHistory).toHaveLength(1);
      expect(newState.moveHistory[0]).toEqual(scoreMove);
    });

    it('should calculate upper section bonus when threshold reached', () => {
      // Set up scorecard with high upper section scores
      const scorecard = gameState.metadata.scorecards.get('player1')!;
      scorecard.categories.set(YahtzeeCategory.TWOS, 10);
      scorecard.categories.set(YahtzeeCategory.THREES, 15);
      scorecard.categories.set(YahtzeeCategory.FOURS, 20);
      scorecard.categories.set(YahtzeeCategory.FIVES, 25);
      scorecard.upperSectionTotal = 70; // Already over threshold

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES,
        },
      };

      const newState = applyMove(gameState, 'player1', scoreMove);

      // Should award upper section bonus
      const updatedScorecard = newState.metadata.scorecards.get('player1')!;
      expect(updatedScorecard.upperSectionBonus).toBe(35);
      expect(updatedScorecard.grandTotal).toBe(70 + 3 + 35); // Previous + ones + bonus
    });

    it('should handle lower section scoring correctly', () => {
      gameState.metadata.currentDice.values = [2, 2, 2, 3, 4]; // Three of a kind

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.THREE_OF_A_KIND,
        },
      };

      const newState = applyMove(gameState, 'player1', scoreMove);

      // Should calculate sum of all dice for three of a kind
      const scorecard = newState.metadata.scorecards.get('player1')!;
      expect(scorecard.categories.get(YahtzeeCategory.THREE_OF_A_KIND)).toBe(13); // 2+2+2+3+4
      expect(scorecard.lowerSectionTotal).toBe(13);
      expect(scorecard.grandTotal).toBe(13);
    });

    it('should handle zero score for invalid combinations', () => {
      gameState.metadata.currentDice.values = [1, 2, 3, 4, 6]; // No pairs

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.FULL_HOUSE,
        },
      };

      const newState = applyMove(gameState, 'player1', scoreMove);

      // Should score 0 for invalid full house
      const scorecard = newState.metadata.scorecards.get('player1')!;
      expect(scorecard.categories.get(YahtzeeCategory.FULL_HOUSE)).toBe(0);
      expect(scorecard.lowerSectionTotal).toBe(0);
      expect(scorecard.grandTotal).toBe(0);
    });
  });

  describe('Turn Advancement Logic', () => {
    it('should advance to next player after scoring', () => {
      gameState.metadata.gamePhase = 'scoring';

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.CHANCE,
        },
      };

      const newState = applyMove(gameState, 'player1', scoreMove);

      // Should advance to player 2
      expect(newState.currentPlayerIndex).toBe(1);
      expect(newState.players[newState.currentPlayerIndex].id).toBe('player2');
    });

    it('should wrap around to first player after last player', () => {
      gameState.currentPlayerIndex = 1; // Player 2's turn
      gameState.metadata.gamePhase = 'scoring';

      const scoreMove: YahtzeeMove = {
        playerId: 'player2',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.CHANCE,
        },
      };

      const newState = applyMove(gameState, 'player2', scoreMove);

      // Should wrap back to player 1
      expect(newState.currentPlayerIndex).toBe(0);
      expect(newState.players[newState.currentPlayerIndex].id).toBe('player1');
    });

    it('should reset turn state after scoring', () => {
      gameState.metadata.gamePhase = 'scoring';
      gameState.metadata.rollCount = 3;
      gameState.metadata.currentDice.keptDice = [true, true, false, true, false];

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES,
        },
      };

      const newState = applyMove(gameState, 'player1', scoreMove);

      // Should reset turn state
      expect(newState.metadata.rollCount).toBe(0);
      expect(newState.metadata.gamePhase).toBe('rolling');
      expect(newState.metadata.currentDice.keptDice).toEqual([false, false, false, false, false]);
      expect(newState.metadata.rollHistory).toEqual([]);
    });
  });

  describe('Game Completion Detection', () => {
    it('should detect game is not over when categories remain', () => {
      const result = isGameOver(gameState);
      expect(result).toBe(false);
    });

    it('should detect game is over when all categories filled', () => {
      // Fill all categories for all players
      gameState.metadata.scorecards.forEach((scorecard) => {
        Object.values(YahtzeeCategory).forEach((category) => {
          scorecard.categories.set(category, 10); // Arbitrary score
        });
      });

      const result = isGameOver(gameState);
      expect(result).toBe(true);
    });

    it('should not detect game over if only some players finished', () => {
      // Fill all categories for player 1 only
      const scorecard1 = gameState.metadata.scorecards.get('player1')!;
      Object.values(YahtzeeCategory).forEach((category) => {
        scorecard1.categories.set(category, 10);
      });

      const result = isGameOver(gameState);
      expect(result).toBe(false);
    });

    it('should determine winner correctly', () => {
      // Fill all categories with different totals
      const scorecard1 = gameState.metadata.scorecards.get('player1')!;
      const scorecard2 = gameState.metadata.scorecards.get('player2')!;

      Object.values(YahtzeeCategory).forEach((category) => {
        scorecard1.categories.set(category, 10);
        scorecard2.categories.set(category, 5);
      });

      scorecard1.grandTotal = 130;
      scorecard2.grandTotal = 65;

      const winner = getWinner(gameState);
      expect(winner).toBe('player1');
    });

    it('should handle tie games', () => {
      // Fill all categories with same totals
      const scorecard1 = gameState.metadata.scorecards.get('player1')!;
      const scorecard2 = gameState.metadata.scorecards.get('player2')!;

      Object.values(YahtzeeCategory).forEach((category) => {
        scorecard1.categories.set(category, 10);
        scorecard2.categories.set(category, 10);
      });

      scorecard1.grandTotal = 130;
      scorecard2.grandTotal = 130;

      const winner = getWinner(gameState);
      expect(winner).toBeNull(); // No winner in tie
    });

    it('should return null winner for incomplete game', () => {
      const winner = getWinner(gameState);
      expect(winner).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing scorecard gracefully', () => {
      gameState.metadata.scorecards.delete('player1');
      gameState.metadata.gamePhase = 'scoring';

      const scoreMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'score',
        parameters: {
          category: YahtzeeCategory.ONES,
        },
      };

      expect(() => applyMove(gameState, 'player1', scoreMove)).toThrow('Scorecard not found');
    });

    it('should handle invalid dice values gracefully', () => {
      gameState.metadata.currentDice.values = [0, 7, -1, 10, 3]; // Invalid values

      const rollMove: YahtzeeMove = {
        playerId: 'player1',
        timestamp: new Date(),
        action: 'roll',
        parameters: {
          keepDice: [false, false, false, false, false],
        },
      };

      const newState = applyMove(gameState, 'player1', rollMove);

      // Should generate valid dice values
      newState.metadata.currentDice.values.forEach((value: number) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      });
    });

    it('should handle single player game completion', () => {
      // Create single player game
      gameState.players = [players[0]];
      gameState.currentPlayerIndex = 0;
      gameState.metadata.scorecards = new Map([
        ['player1', gameState.metadata.scorecards.get('player1')!],
      ]);

      // Fill all categories
      const scorecard = gameState.metadata.scorecards.get('player1')!;
      Object.values(YahtzeeCategory).forEach((category) => {
        scorecard.categories.set(category, 10);
      });
      scorecard.grandTotal = 130;

      expect(isGameOver(gameState)).toBe(true);
      expect(getWinner(gameState)).toBe('player1');
    });
  });
});
