import { AIPlayer } from '../models/AIPlayer';

/**
 * Parameters for creating a new AI player
 */
export interface CreateAIPlayerParams {
  name: string;
  gameType: string;
  strategyId: string;
  difficulty?: string;
  configuration?: Record<string, any>;
}

/**
 * Parameters for updating an AI player
 */
export interface UpdateAIPlayerParams {
  name?: string;
  strategyId?: string;
  difficulty?: string;
  configuration?: Record<string, any>;
}

/**
 * Filters for querying AI players
 */
export interface AIPlayerFilters {
  gameType?: string;
  strategyId?: string;
  difficulty?: string;
}

/**
 * Repository interface for AI player persistence
 * Manages the storage and retrieval of AI player configurations
 */
export interface IAIPlayerRepository {
  /**
   * Create a new AI player
   * @param params AI player creation parameters
   * @returns Created AI player
   * @throws Error if AI player creation fails
   */
  create(params: CreateAIPlayerParams): Promise<AIPlayer>;

  /**
   * Find an AI player by ID
   * @param id AI player ID
   * @returns AI player if found, null otherwise
   */
  findById(id: string): Promise<AIPlayer | null>;

  /**
   * Find AI players by game type
   * @param gameType Game type to filter by
   * @returns Array of AI players for the specified game type
   */
  findByGameType(gameType: string): Promise<AIPlayer[]>;

  /**
   * Find AI players by strategy ID
   * @param strategyId Strategy ID to filter by
   * @returns Array of AI players using the specified strategy
   */
  findByStrategyId(strategyId: string): Promise<AIPlayer[]>;

  /**
   * Find all AI players with optional filters
   * @param filters Optional filters to apply
   * @returns Array of AI players matching the filters
   */
  findAll(filters?: AIPlayerFilters): Promise<AIPlayer[]>;

  /**
   * Update an existing AI player
   * @param id AI player ID
   * @param params Update parameters
   * @returns Updated AI player
   * @throws Error if AI player not found
   */
  update(id: string, params: UpdateAIPlayerParams): Promise<AIPlayer>;

  /**
   * Delete an AI player by ID
   * @param id AI player ID
   * @throws Error if AI player not found
   */
  delete(id: string): Promise<void>;

  /**
   * Check if an AI player exists
   * @param id AI player ID
   * @returns true if AI player exists, false otherwise
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get count of AI players by game type
   * @param gameType Game type to count
   * @returns Number of AI players for the specified game type
   */
  countByGameType(gameType: string): Promise<number>;

  /**
   * Performs a health check on the repository
   * @returns true if repository is healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;
}
