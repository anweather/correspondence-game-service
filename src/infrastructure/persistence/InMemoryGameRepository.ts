import { GameRepository, GameFilters, PaginatedResult } from '@domain/interfaces';
import { GameState } from '@domain/models';
import { ConcurrencyError, GameNotFoundError } from '@domain/errors';

/**
 * In-memory implementation of GameRepository
 * Uses Map for fast lookups and stores game state in memory
 */
export class InMemoryGameRepository implements GameRepository {
  private games: Map<string, GameState>;

  constructor() {
    this.games = new Map();
  }

  /**
   * Save a new game state
   */
  async save(state: GameState): Promise<void> {
    this.games.set(state.gameId, state);
  }

  /**
   * Find a game by its ID
   */
  async findById(gameId: string): Promise<GameState | null> {
    const game = this.games.get(gameId);
    return game || null;
  }

  /**
   * Find all games with optional filters and pagination
   */
  async findAll(filters: GameFilters): Promise<PaginatedResult<GameState>> {
    // Get all games
    let games = Array.from(this.games.values());

    // Apply lifecycle filter
    if (filters.lifecycle) {
      games = games.filter((game) => game.lifecycle === filters.lifecycle);
    }

    // Apply game type filter
    if (filters.gameType) {
      games = games.filter((game) => game.gameType === filters.gameType);
    }

    // Calculate pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const total = games.length;
    const totalPages = Math.ceil(total / pageSize);

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = games.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Find games by player ID with optional filters and pagination
   */
  async findByPlayer(playerId: string, filters: GameFilters): Promise<PaginatedResult<GameState>> {
    // Get all games where player is a participant
    let games = Array.from(this.games.values()).filter((game) =>
      game.players.some((p) => p.id === playerId)
    );

    // Apply lifecycle filter
    if (filters.lifecycle) {
      games = games.filter((game) => game.lifecycle === filters.lifecycle);
    }

    // Apply game type filter
    if (filters.gameType) {
      games = games.filter((game) => game.gameType === filters.gameType);
    }

    // Calculate pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const total = games.length;
    const totalPages = Math.ceil(total / pageSize);

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = games.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Update an existing game state with optimistic locking
   * @throws ConcurrencyError if version mismatch
   * @throws GameNotFoundError if game not found
   */
  async update(gameId: string, state: GameState, expectedVersion: number): Promise<GameState> {
    const existingGame = this.games.get(gameId);

    if (!existingGame) {
      throw new GameNotFoundError(gameId);
    }

    if (existingGame.version !== expectedVersion) {
      throw new ConcurrencyError(gameId);
    }

    this.games.set(gameId, state);
    return state;
  }

  /**
   * Delete a game by its ID
   */
  async delete(gameId: string): Promise<void> {
    this.games.delete(gameId);
  }

  /**
   * Performs a health check on the repository
   * In-memory repository is always healthy
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
