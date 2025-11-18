import { GameEnginePlugin } from '@domain/interfaces';

/**
 * Information about a registered game type
 */
export interface GameTypeInfo {
  type: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  configSchema?: object;
}

/**
 * Registry for managing game engine plugins
 * Provides registration, retrieval, and listing of available game types
 */
export class PluginRegistry {
  private plugins: Map<string, GameEnginePlugin>;

  constructor() {
    this.plugins = new Map();
  }

  /**
   * Register a new game engine plugin
   * @param plugin - The game engine plugin to register
   * @throws Error if a plugin with the same game type is already registered
   */
  register(plugin: GameEnginePlugin): void {
    const gameType = plugin.getGameType();
    
    if (this.plugins.has(gameType)) {
      throw new Error(`Game type "${gameType}" is already registered`);
    }
    
    this.plugins.set(gameType, plugin);
  }

  /**
   * Retrieve a registered game engine plugin by game type
   * @param gameType - The game type to retrieve
   * @returns The game engine plugin, or null if not found
   */
  get(gameType: string): GameEnginePlugin | null {
    return this.plugins.get(gameType) || null;
  }

  /**
   * List all registered game types with their metadata
   * @returns Array of game type information
   */
  list(): GameTypeInfo[] {
    const gameTypes: GameTypeInfo[] = [];
    
    for (const plugin of this.plugins.values()) {
      gameTypes.push({
        type: plugin.getGameType(),
        name: plugin.getGameType(),
        description: plugin.getDescription(),
        minPlayers: plugin.getMinPlayers(),
        maxPlayers: plugin.getMaxPlayers(),
      });
    }
    
    return gameTypes;
  }

  /**
   * Unregister a game engine plugin
   * @param gameType - The game type to unregister
   */
  unregister(gameType: string): void {
    this.plugins.delete(gameType);
  }
}
