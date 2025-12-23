/**
 * Unit tests for Yahtzee initialization module
 * Tests game state creation, scorecard initialization, and turn order establishment
 * Requirements: 1.1, 1.2, 1.3
 */

import { Player, GameLifecycle } from '../../../../src/domain/models';
import { GameConfig } from '../../../../src/domain/interfaces';
import { YahtzeeMetadata } from '../../shared/types';
import { DICE_COUNT, ALL_CATEGORIES } from '../../shared/constants';
import * as initialization from '../initialization';

describe('Yahtzee Initialization Module', () => {
  const mockPlayers: Player[] = [
    {
      id: 'player1',
      name: 'Alice',
      joinedAt: new Date('2023-01-01T10:00:00Z'),
    },
    {
      id: 'player2',
      name: 'Bob',
      joinedAt: new Date('2023-01-01T10:01:00Z'),
    },
    {
      id: 'player3',
      name: 'Charlie',
      joinedAt: new Date('2023-01-01T10:02:00Z'),
    },
  ];

  const mockConfig: GameConfig = {
    customSettings: {
      gameId: 'test-yahtzee-123',
    },
  };

  describe('initializeGame', () => {
    it('should fail - create game state with correct basic properties', () => {
      // This test should fail initially - we haven't implemented the function yet
      const gameState = initialization.initializeGame(mockPlayers, mockConfig);
      
      expect(gameState.gameId).toBe('test-yahtzee-123');
      expect(gameState.gameType).toBe('yahtzee');
      expect(gameState.lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(gameState.players).toEqual(mockPlayers);
      expect(gameState.phase).toBe('rolling');
      expect(gameState.moveHistory).toEqual([]);
      expect(gameState.winner).toBeNull();
      expect(gameState.version).toBe(1);
      expect(gameState.createdAt).toBeInstanceOf(Date);
      expect(gameState.updatedAt).toBeInstanceOf(Date);
    });

    it('should fail - initialize scorecards for all players', () => {
      const gameState = initialization.initializeGame(mockPlayers, mockConfig);
      const metadata = gameState.metadata as YahtzeeMetadata;
      
      // Should have scorecards for all players
      expect(metadata.scorecards.size).toBe(3);
      expect(metadata.scorecards.has('player1')).toBe(true);
      expect(metadata.scorecards.has('player2')).toBe(true);
      expect(metadata.scorecards.has('player3')).toBe(true);
      
      // Each scorecard should have all categories available (null)
      const player1Scorecard = metadata.scorecards.get('player1')!;
      expect(player1Scorecard.playerId).toBe('player1');
      expect(player1Scorecard.categories.size).toBe(13);
      
      // All categories should be null (available)
      ALL_CATEGORIES.forEach(category => {
        expect(player1Scorecard.categories.get(category)).toBeNull();
      });
      
      // Initial totals should be zero
      expect(player1Scorecard.upperSectionTotal).toBe(0);
      expect(player1Scorecard.upperSectionBonus).toBe(0);
      expect(player1Scorecard.lowerSectionTotal).toBe(0);
      expect(player1Scorecard.grandTotal).toBe(0);
    });

    it('should fail - establish turn order with first player', () => {
      const gameState = initialization.initializeGame(mockPlayers, mockConfig);
      
      // Should start with first player (index 0)
      expect(gameState.currentPlayerIndex).toBe(0);
    });

    it('should fail - initialize dice state and game metadata', () => {
      const gameState = initialization.initializeGame(mockPlayers, mockConfig);
      const metadata = gameState.metadata as YahtzeeMetadata;
      
      // Should have initial dice state
      expect(metadata.currentDice.values).toHaveLength(DICE_COUNT);
      expect(metadata.currentDice.keptDice).toHaveLength(DICE_COUNT);
      
      // All dice should be initially not kept
      metadata.currentDice.keptDice.forEach(kept => {
        expect(kept).toBe(false);
      });
      
      // Initial game state
      expect(metadata.rollCount).toBe(0);
      expect(metadata.gamePhase).toBe('rolling');
      expect(metadata.rollHistory).toEqual([]);
      expect(metadata.randomSeed).toBeDefined();
      expect(typeof metadata.randomSeed).toBe('string');
    });

    it('should fail - handle single player game', () => {
      const singlePlayer = [mockPlayers[0]];
      const gameState = initialization.initializeGame(singlePlayer, mockConfig);
      const metadata = gameState.metadata as YahtzeeMetadata;
      
      expect(gameState.players).toHaveLength(1);
      expect(metadata.scorecards.size).toBe(1);
      expect(metadata.scorecards.has('player1')).toBe(true);
    });

    it('should fail - handle maximum players (8)', () => {
      const maxPlayers: Player[] = Array.from({ length: 8 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        joinedAt: new Date(),
      }));
      
      const gameState = initialization.initializeGame(maxPlayers, mockConfig);
      const metadata = gameState.metadata as YahtzeeMetadata;
      
      expect(gameState.players).toHaveLength(8);
      expect(metadata.scorecards.size).toBe(8);
      
      // Verify all players have scorecards
      maxPlayers.forEach(player => {
        expect(metadata.scorecards.has(player.id)).toBe(true);
      });
    });

    it('should fail - generate unique game ID when not provided', () => {
      const configWithoutId: GameConfig = {};
      const gameState = initialization.initializeGame(mockPlayers, configWithoutId);
      
      expect(gameState.gameId).toBeDefined();
      expect(gameState.gameId).toMatch(/^yahtzee-\d+-[a-z0-9]+$/);
    });
  });

  describe('createEmptyScorecard', () => {
    it('should fail - create scorecard with all categories null', () => {
      const scorecard = initialization.createEmptyScorecard('test-player');
      
      expect(scorecard.playerId).toBe('test-player');
      expect(scorecard.categories.size).toBe(13);
      
      // All categories should be null (available)
      ALL_CATEGORIES.forEach(category => {
        expect(scorecard.categories.get(category)).toBeNull();
      });
      
      // All totals should be zero
      expect(scorecard.upperSectionTotal).toBe(0);
      expect(scorecard.upperSectionBonus).toBe(0);
      expect(scorecard.lowerSectionTotal).toBe(0);
      expect(scorecard.grandTotal).toBe(0);
    });
  });

  describe('createInitialDiceState', () => {
    it('should fail - create dice state with correct structure', () => {
      const diceState = initialization.createInitialDiceState();
      
      expect(diceState.values).toHaveLength(DICE_COUNT);
      expect(diceState.keptDice).toHaveLength(DICE_COUNT);
      
      // All dice should initially not be kept
      diceState.keptDice.forEach(kept => {
        expect(kept).toBe(false);
      });
      
      // All dice values should be valid (1-6)
      diceState.values.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      });
    });
  });
});