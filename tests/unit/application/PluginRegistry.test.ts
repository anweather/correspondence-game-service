import { PluginRegistry } from '@application/PluginRegistry';
import { BaseGameEngine } from '@domain/interfaces';
import { GameState, Player, Move, GameLifecycle } from '@domain/models';
import { GameConfig, ValidationResult, BoardRenderData } from '@domain/interfaces';

// Mock game engine for testing
class MockGameEngine extends BaseGameEngine {
  constructor(
    private gameType: string,
    private minPlayers: number = 2,
    private maxPlayers: number = 4,
    private description: string = 'Mock game for testing'
  ) {
    super();
  }

  getGameType(): string {
    return this.gameType;
  }

  getMinPlayers(): number {
    return this.minPlayers;
  }

  getMaxPlayers(): number {
    return this.maxPlayers;
  }

  getDescription(): string {
    return this.description;
  }

  initializeGame(players: Player[], _config: GameConfig): GameState {
    return {
      gameId: 'test-game',
      gameType: this.gameType,
      lifecycle: GameLifecycle.ACTIVE,
      players,
      currentPlayerIndex: 0,
      phase: 'main',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      winner: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  validateMove(_state: GameState, _playerId: string, _move: Move): ValidationResult {
    return { valid: true };
  }

  applyMove(state: GameState, _playerId: string, _move: Move): GameState {
    return { ...state, version: state.version + 1 };
  }

  renderBoard(_state: GameState): BoardRenderData {
    return {
      viewBox: { width: 100, height: 100 },
      spaces: [],
      layers: [],
    };
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register', () => {
    it('should register a new game plugin', () => {
      const plugin = new MockGameEngine('tic-tac-toe');

      expect(() => registry.register(plugin)).not.toThrow();
    });

    it('should allow retrieving a registered plugin', () => {
      const plugin = new MockGameEngine('tic-tac-toe');
      registry.register(plugin);

      const retrieved = registry.get('tic-tac-toe');
      expect(retrieved).toBe(plugin);
    });

    it('should throw error when registering duplicate game type', () => {
      const plugin1 = new MockGameEngine('tic-tac-toe');
      const plugin2 = new MockGameEngine('tic-tac-toe');

      registry.register(plugin1);

      expect(() => registry.register(plugin2)).toThrow(
        'Game type "tic-tac-toe" is already registered'
      );
    });

    it('should allow registering multiple different game types', () => {
      const plugin1 = new MockGameEngine('tic-tac-toe');
      const plugin2 = new MockGameEngine('chess');
      const plugin3 = new MockGameEngine('checkers');

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      expect(registry.get('tic-tac-toe')).toBe(plugin1);
      expect(registry.get('chess')).toBe(plugin2);
      expect(registry.get('checkers')).toBe(plugin3);
    });
  });

  describe('get', () => {
    it('should return null for unregistered game type', () => {
      const result = registry.get('nonexistent-game');
      expect(result).toBeNull();
    });

    it('should return the correct plugin for registered game type', () => {
      const plugin = new MockGameEngine('tic-tac-toe');
      registry.register(plugin);

      const retrieved = registry.get('tic-tac-toe');
      expect(retrieved).toBe(plugin);
      expect(retrieved?.getGameType()).toBe('tic-tac-toe');
    });

    it('should be case-sensitive for game type names', () => {
      const plugin = new MockGameEngine('tic-tac-toe');
      registry.register(plugin);

      expect(registry.get('tic-tac-toe')).toBe(plugin);
      expect(registry.get('Tic-Tac-Toe')).toBeNull();
      expect(registry.get('TIC-TAC-TOE')).toBeNull();
    });
  });

  describe('list', () => {
    it('should return empty array when no plugins registered', () => {
      const list = registry.list();
      expect(list).toEqual([]);
    });

    it('should return game type info for single registered plugin', () => {
      const plugin = new MockGameEngine('tic-tac-toe', 2, 2, 'Classic Tic-Tac-Toe');
      registry.register(plugin);

      const list = registry.list();
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({
        type: 'tic-tac-toe',
        name: 'tic-tac-toe',
        description: 'Classic Tic-Tac-Toe',
        minPlayers: 2,
        maxPlayers: 2,
      });
    });

    it('should return game type info for multiple registered plugins', () => {
      const plugin1 = new MockGameEngine('tic-tac-toe', 2, 2, 'Classic Tic-Tac-Toe');
      const plugin2 = new MockGameEngine('chess', 2, 2, 'Classic Chess');
      const plugin3 = new MockGameEngine('checkers', 2, 2, 'Classic Checkers');

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      const list = registry.list();
      expect(list).toHaveLength(3);

      const types = list.map((info) => info.type);
      expect(types).toContain('tic-tac-toe');
      expect(types).toContain('chess');
      expect(types).toContain('checkers');
    });

    it('should include all metadata fields in game type info', () => {
      const plugin = new MockGameEngine('poker', 2, 8, "Texas Hold'em Poker");
      registry.register(plugin);

      const list = registry.list();
      expect(list[0]).toEqual({
        type: 'poker',
        name: 'poker',
        description: "Texas Hold'em Poker",
        minPlayers: 2,
        maxPlayers: 8,
      });
    });
  });

  describe('unregister', () => {
    it('should remove a registered plugin', () => {
      const plugin = new MockGameEngine('tic-tac-toe');
      registry.register(plugin);

      expect(registry.get('tic-tac-toe')).toBe(plugin);

      registry.unregister('tic-tac-toe');

      expect(registry.get('tic-tac-toe')).toBeNull();
    });

    it('should not throw error when unregistering non-existent game type', () => {
      expect(() => registry.unregister('nonexistent-game')).not.toThrow();
    });

    it('should remove plugin from list after unregistering', () => {
      const plugin1 = new MockGameEngine('tic-tac-toe');
      const plugin2 = new MockGameEngine('chess');

      registry.register(plugin1);
      registry.register(plugin2);

      expect(registry.list()).toHaveLength(2);

      registry.unregister('tic-tac-toe');

      const list = registry.list();
      expect(list).toHaveLength(1);
      expect(list[0].type).toBe('chess');
    });

    it('should allow re-registering after unregistering', () => {
      const plugin1 = new MockGameEngine('tic-tac-toe', 2, 2, 'Version 1');
      const plugin2 = new MockGameEngine('tic-tac-toe', 2, 4, 'Version 2');

      registry.register(plugin1);
      registry.unregister('tic-tac-toe');

      expect(() => registry.register(plugin2)).not.toThrow();

      const retrieved = registry.get('tic-tac-toe');
      expect(retrieved?.getDescription()).toBe('Version 2');
      expect(retrieved?.getMaxPlayers()).toBe(4);
    });

    it('should handle unregistering from registry with multiple plugins', () => {
      const plugin1 = new MockGameEngine('tic-tac-toe');
      const plugin2 = new MockGameEngine('chess');
      const plugin3 = new MockGameEngine('checkers');

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      registry.unregister('chess');

      expect(registry.get('tic-tac-toe')).toBe(plugin1);
      expect(registry.get('chess')).toBeNull();
      expect(registry.get('checkers')).toBe(plugin3);
      expect(registry.list()).toHaveLength(2);
    });
  });
});
