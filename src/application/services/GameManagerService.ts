import { PluginRegistry } from '@application/PluginRegistry';
import { AIPlayerService } from '@application/services/AIPlayerService';
import { GameRepository, GameConfig, GameFilters, PaginatedResult } from '@domain/interfaces';
import { GameState, Player, GameLifecycle } from '@domain/models';
import { GameNotFoundError, GameFullError } from '@domain/errors';
import { randomUUID } from 'crypto';

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
 * Service for managing game instances
 * Handles game creation, player joining, and game listing
 */
export class GameManagerService {
  constructor(
    private registry: PluginRegistry,
    private repository: GameRepository,
    private aiPlayerService: AIPlayerService
  ) {}

  /**
   * Create a new game instance
   * @param gameType - The type of game to create
   * @param config - Configuration for the game
   * @param creator - Optional authenticated user who is creating the game
   * @param gameName - Required name for the game
   * @param gameDescription - Optional description for the game
   * @returns The created game state
   * @throws Error if game type is not supported
   */
  async createGame(
    gameType: string,
    config: GameConfig,
    creator?: { id: string; username: string },
    gameName?: string,
    gameDescription?: string
  ): Promise<GameState> {
    const plugin = this.registry.get(gameType);

    if (!plugin) {
      throw new Error(`Game type "${gameType}" is not supported`);
    }

    const gameId = randomUUID();

    // Handle AI players if provided
    let allPlayers = config.players || [];
    if (config.aiPlayers && config.aiPlayers.length > 0) {
      // Create AI players through AIPlayerService
      const aiPlayers = await this.aiPlayerService.createAIPlayers(gameType, config.aiPlayers);

      // Convert AI players to Player objects and add to player list
      const aiPlayerObjects = aiPlayers.map((aiPlayer) => aiPlayer.toPlayer());
      allPlayers = [...allPlayers, ...aiPlayerObjects];
    }

    const minPlayers = plugin.getMinPlayers();

    // Determine initial lifecycle state
    let lifecycle: GameLifecycle;
    if (allPlayers.length === 0) {
      lifecycle = GameLifecycle.CREATED;
    } else if (allPlayers.length < minPlayers) {
      lifecycle = GameLifecycle.WAITING_FOR_PLAYERS;
    } else {
      lifecycle = GameLifecycle.ACTIVE;
    }

    // Initialize game state using plugin with all players (human + AI)
    const initialState = plugin.initializeGame(allPlayers, config);

    // Prepare metadata with creator information and game metadata
    const metadata = {
      ...initialState.metadata,
      ...(creator && { creatorPlayerId: creator.id }),
      ...(gameName && { gameName }),
      ...(gameDescription && { gameDescription }),
    };

    // Override with our managed fields
    const gameState: GameState = {
      ...initialState,
      gameId,
      gameType,
      lifecycle,
      players: allPlayers,
      metadata,
      winner: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to repository
    await this.repository.save(gameState);

    // Invoke lifecycle hook
    plugin.onGameCreated(gameState, config);

    // Enhance with AI information before returning
    return this.enhanceGameWithAIInfo(gameState);
  }

  /**
   * Add a player to a game
   * @param gameId - The game ID to join
   * @param player - The player to add
   * @returns The updated game state
   * @throws GameNotFoundError if game not found
   * @throws GameFullError if game is at maximum capacity
   * @throws Error if game is not in joinable state or player already in game
   */
  async joinGame(gameId: string, player: Player): Promise<GameState> {
    const game = await this.repository.findById(gameId);

    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // Get plugin to check max players
    const plugin = this.registry.get(game.gameType);
    if (!plugin) {
      throw new Error(`Game type "${game.gameType}" is not supported`);
    }

    // Check if game is full first (more specific error)
    if (game.players.length >= plugin.getMaxPlayers()) {
      throw new GameFullError(gameId);
    }

    // Check if game is in joinable state
    // Allow joining CREATED, WAITING_FOR_PLAYERS, and ACTIVE (if not full)
    if (
      game.lifecycle !== GameLifecycle.CREATED &&
      game.lifecycle !== GameLifecycle.WAITING_FOR_PLAYERS &&
      game.lifecycle !== GameLifecycle.ACTIVE
    ) {
      throw new Error(`Cannot join game in lifecycle state: ${game.lifecycle}`);
    }

    // Check if player already in game
    if (game.players.some((p) => p.id === player.id)) {
      throw new Error(`Player ${player.id} is already in the game`);
    }

    // Add player
    const updatedPlayers = [...game.players, player];

    // Determine new lifecycle state
    let newLifecycle: GameLifecycle = game.lifecycle;
    if (game.lifecycle === GameLifecycle.CREATED) {
      newLifecycle =
        updatedPlayers.length >= plugin.getMinPlayers()
          ? GameLifecycle.ACTIVE
          : GameLifecycle.WAITING_FOR_PLAYERS;
    } else if (game.lifecycle === GameLifecycle.WAITING_FOR_PLAYERS) {
      if (updatedPlayers.length >= plugin.getMinPlayers()) {
        newLifecycle = GameLifecycle.ACTIVE;
      }
    }

    // Update game state
    const updatedGame: GameState = {
      ...game,
      players: updatedPlayers,
      lifecycle: newLifecycle,
      version: game.version + 1,
      updatedAt: new Date(),
    };

    // Save updated state
    await this.repository.update(gameId, updatedGame, game.version);

    // Invoke lifecycle hooks
    plugin.onPlayerJoined(updatedGame, player.id);

    // Check if game just transitioned to ACTIVE
    const wasNotActive =
      game.lifecycle === GameLifecycle.CREATED ||
      game.lifecycle === GameLifecycle.WAITING_FOR_PLAYERS;
    if (newLifecycle === GameLifecycle.ACTIVE && wasNotActive) {
      plugin.onGameStarted(updatedGame);
    }

    return this.enhanceGameWithAIInfo(updatedGame);
  }

  /**
   * List games with optional filtering and pagination
   * @param filters - Filters to apply
   * @returns Paginated list of games
   */
  async listGames(filters: GameFilters): Promise<PaginatedResult<GameState>> {
    let result: PaginatedResult<GameState>;

    // If playerId filter is provided, use repository's findByPlayer
    if (filters.playerId) {
      result = await this.repository.findByPlayer(filters.playerId, filters);
    } else {
      // Otherwise, use findAll
      result = await this.repository.findAll(filters);
    }

    // Enhance games with AI indicators
    const enhancedGames = result.items.map((game) => this.enhanceGameWithAIInfo(game));

    return {
      ...result,
      items: enhancedGames,
    };
  }

  /**
   * Get a game by its ID with AI information enhanced
   * @param gameId - The game ID to retrieve
   * @returns The game state with AI information, or null if not found
   */
  async getGame(gameId: string): Promise<GameState | null> {
    const game = await this.repository.findById(gameId);
    if (!game) {
      return null;
    }

    return this.enhanceGameWithAIInfo(game);
  }

  /**
   * Enhance a game state with AI player information
   * @param game - The game state to enhance
   * @returns Enhanced game state with AI indicators
   */
  private enhanceGameWithAIInfo(game: GameState): GameState {
    const aiPlayerCount = game.players.filter((player) => player.metadata?.isAI === true).length;
    const hasAIPlayers = aiPlayerCount > 0;

    return {
      ...game,
      metadata: {
        ...game.metadata,
        hasAIPlayers,
        aiPlayerCount,
      },
    };
  }

  /**
   * List all available game types
   * @returns Array of game type information
   */
  listAvailableGameTypes(): GameTypeInfo[] {
    return this.registry.list();
  }
}
