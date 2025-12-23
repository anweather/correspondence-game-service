/**
 * Basic structure test for YahtzeeEngine
 *
 * This test verifies that the plugin structure is set up correctly
 * and can be instantiated. Full functionality tests will be added
 * as modules are implemented in subsequent tasks.
 */

import { YahtzeeEngine } from '../YahtzeeEngine';
import { GAME_TYPE, MIN_PLAYERS, MAX_PLAYERS, GAME_DESCRIPTION } from '../../shared/constants';

describe('YahtzeeEngine - Basic Structure', () => {
  let engine: YahtzeeEngine;

  beforeEach(() => {
    engine = new YahtzeeEngine();
  });

  describe('Metadata', () => {
    it('should return correct game type', () => {
      expect(engine.getGameType()).toBe(GAME_TYPE);
    });

    it('should return correct player limits', () => {
      expect(engine.getMinPlayers()).toBe(MIN_PLAYERS);
      expect(engine.getMaxPlayers()).toBe(MAX_PLAYERS);
    });

    it('should return game description', () => {
      expect(engine.getDescription()).toBe(GAME_DESCRIPTION);
    });
  });

  describe('Plugin Interface', () => {
    it('should be instantiable', () => {
      expect(engine).toBeInstanceOf(YahtzeeEngine);
    });

    it('should have all required BaseGameEngine methods', () => {
      expect(typeof engine.getGameType).toBe('function');
      expect(typeof engine.getMinPlayers).toBe('function');
      expect(typeof engine.getMaxPlayers).toBe('function');
      expect(typeof engine.getDescription).toBe('function');
      expect(typeof engine.initializeGame).toBe('function');
      expect(typeof engine.validateMove).toBe('function');
      expect(typeof engine.applyMove).toBe('function');
      expect(typeof engine.isGameOver).toBe('function');
      expect(typeof engine.getWinner).toBe('function');
      expect(typeof engine.renderBoard).toBe('function');
    });
  });

  describe('Implemented Methods', () => {
    it('should have working initializeGame method', () => {
      const players = [{ id: 'player1', name: 'Test Player', joinedAt: new Date() }];
      const config = { customSettings: { gameId: 'test-game' } };

      expect(() => engine.initializeGame(players, config)).not.toThrow();
      const gameState = engine.initializeGame(players, config);
      expect(gameState.gameId).toBe('test-game');
      expect(gameState.gameType).toBe(GAME_TYPE);
    });

    it('should have working validateMove method', () => {
      // validateMove should not throw - it's now implemented
      expect(() => engine.validateMove({} as any, 'player1', {} as any)).not.toThrow();
    });

    it('should have working applyMove method', () => {
      // applyMove should handle invalid moves gracefully
      expect(() => engine.applyMove({} as any, 'player1', {} as any)).toThrow('Invalid move type');
    });

    it('should have working isGameOver method', () => {
      // isGameOver should not throw - it's now implemented
      expect(() => engine.isGameOver({} as any)).not.toThrow();
    });

    it('should have working getWinner method', () => {
      // getWinner should not throw - it's now implemented
      expect(() => engine.getWinner({} as any)).not.toThrow();
    });
  });

  describe('Unimplemented Methods', () => {
    it('should throw appropriate errors for unimplemented methods', () => {
      expect(() => engine.renderBoard({} as any)).toThrow('renderBoard not yet implemented');
    });
  });
});
