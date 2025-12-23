/**
 * Yahtzee Plugin Integration Test
 * 
 * Verifies that the complete Yahtzee plugin structure is properly set up
 * and integrates correctly with the service architecture.
 */

import { PluginRegistry } from '../../../src/application/PluginRegistry';
import { YahtzeeEngine } from '../engine';
import { GAME_TYPE, MIN_PLAYERS, MAX_PLAYERS } from '../shared';

describe('Yahtzee Plugin Integration', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('should export all necessary components', () => {
    // Verify engine exports
    expect(YahtzeeEngine).toBeDefined();
    expect(typeof YahtzeeEngine).toBe('function');

    // Verify shared exports
    expect(GAME_TYPE).toBe('yahtzee');
    expect(MIN_PLAYERS).toBe(1);
    expect(MAX_PLAYERS).toBe(8);
  });

  it('should integrate with plugin registry system', () => {
    const engine = new YahtzeeEngine();
    
    // Should register without errors
    expect(() => registry.register(engine)).not.toThrow();
    
    // Should be discoverable
    const plugin = registry.get(GAME_TYPE);
    expect(plugin).toBe(engine);
    
    // Should appear in listings
    const plugins = registry.list();
    const yahtzeePlugin = plugins.find(p => p.type === GAME_TYPE);
    expect(yahtzeePlugin).toBeDefined();
  });

  it('should have proper project structure', () => {
    // Verify the engine can be instantiated
    const engine = new YahtzeeEngine();
    expect(engine).toBeInstanceOf(YahtzeeEngine);
    
    // Verify it implements the required interface
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

  it('should be ready for implementation tasks', () => {
    const engine = new YahtzeeEngine();
    
    // Metadata should work (implemented in this task)
    expect(engine.getGameType()).toBe('yahtzee');
    expect(engine.getMinPlayers()).toBe(1);
    expect(engine.getMaxPlayers()).toBe(8);
    expect(engine.getDescription()).toContain('dice');
    
    // initializeGame should work (implemented in task 5)
    const players = [{ id: 'player1', name: 'Test Player', joinedAt: new Date() }];
    const config = { customSettings: { gameId: 'test-game' } };
    expect(() => engine.initializeGame(players, config)).not.toThrow();
    
    // validateMove is now implemented
    expect(() => engine.validateMove({} as any, 'player1', {} as any)).not.toThrow();
    
    // Other methods should throw appropriate errors (to be implemented in future tasks)
    expect(() => engine.applyMove({} as any, 'player1', {} as any)).toThrow('not yet implemented');
    expect(() => engine.isGameOver({} as any)).toThrow('not yet implemented');
    expect(() => engine.getWinner({} as any)).toThrow('not yet implemented');
    expect(() => engine.renderBoard({} as any)).toThrow('not yet implemented');
  });
});