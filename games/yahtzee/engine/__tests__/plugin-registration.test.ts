/**
 * Plugin Registration Test
 * 
 * Verifies that the Yahtzee plugin can be successfully registered
 * with the PluginRegistry and integrates with the service architecture.
 */

import { PluginRegistry } from '../../../../src/application/PluginRegistry';
import { YahtzeeEngine } from '../YahtzeeEngine';
import { GAME_TYPE } from '../../shared/constants';

describe('Yahtzee Plugin Registration', () => {
  let registry: PluginRegistry;
  let engine: YahtzeeEngine;

  beforeEach(() => {
    registry = new PluginRegistry();
    engine = new YahtzeeEngine();
  });

  it('should register successfully with PluginRegistry', () => {
    expect(() => registry.register(engine)).not.toThrow();
  });

  it('should be discoverable after registration', () => {
    registry.register(engine);
    
    const plugin = registry.get(GAME_TYPE);
    expect(plugin).toBeDefined();
    expect(plugin).toBe(engine);
  });

  it('should appear in plugin list', () => {
    registry.register(engine);
    
    const plugins = registry.list();
    const yahtzeePlugin = plugins.find(p => p.type === GAME_TYPE);
    
    expect(yahtzeePlugin).toBeDefined();
    expect(yahtzeePlugin?.type).toBe(GAME_TYPE);
    expect(yahtzeePlugin?.minPlayers).toBe(engine.getMinPlayers());
    expect(yahtzeePlugin?.maxPlayers).toBe(engine.getMaxPlayers());
    expect(yahtzeePlugin?.description).toBe(engine.getDescription());
  });

  it('should integrate with service architecture requirements', () => {
    // Verify the plugin implements the required interface
    expect(typeof engine.getGameType).toBe('function');
    expect(typeof engine.initializeGame).toBe('function');
    expect(typeof engine.validateMove).toBe('function');
    expect(typeof engine.applyMove).toBe('function');
    expect(typeof engine.renderBoard).toBe('function');
    
    // Verify metadata is correct for service integration
    expect(engine.getGameType()).toBe(GAME_TYPE);
    expect(engine.getMinPlayers()).toBeGreaterThan(0);
    expect(engine.getMaxPlayers()).toBeGreaterThanOrEqual(engine.getMinPlayers());
    expect(engine.getDescription()).toBeTruthy();
  });
});