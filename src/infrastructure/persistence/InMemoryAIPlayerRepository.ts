import {
  IAIPlayerRepository,
  CreateAIPlayerParams,
  UpdateAIPlayerParams,
  AIPlayerFilters,
} from '@domain/interfaces/IAIPlayerRepository';
import { AIPlayer } from '@domain/models/AIPlayer';
import { randomUUID } from 'crypto';

/**
 * In-memory implementation of IAIPlayerRepository
 * Uses Map for fast lookups and stores AI player data in memory
 */
export class InMemoryAIPlayerRepository implements IAIPlayerRepository {
  private aiPlayers: Map<string, AIPlayer>;

  constructor() {
    this.aiPlayers = new Map();
  }

  /**
   * Create a new AI player
   */
  async create(params: CreateAIPlayerParams): Promise<AIPlayer> {
    const id = randomUUID();
    const aiPlayer = new AIPlayer(
      id,
      params.name,
      params.gameType,
      params.strategyId,
      params.difficulty,
      params.configuration
    );

    this.aiPlayers.set(id, aiPlayer);
    return aiPlayer;
  }

  /**
   * Find an AI player by ID
   */
  async findById(id: string): Promise<AIPlayer | null> {
    const aiPlayer = this.aiPlayers.get(id);
    return aiPlayer || null;
  }

  /**
   * Find AI players by game type
   */
  async findByGameType(gameType: string): Promise<AIPlayer[]> {
    const aiPlayers = Array.from(this.aiPlayers.values());
    return aiPlayers.filter((aiPlayer) => aiPlayer.isForGameType(gameType));
  }

  /**
   * Find AI players by strategy ID
   */
  async findByStrategyId(strategyId: string): Promise<AIPlayer[]> {
    const aiPlayers = Array.from(this.aiPlayers.values());
    return aiPlayers.filter((aiPlayer) => aiPlayer.usesStrategy(strategyId));
  }

  /**
   * Find all AI players with optional filters
   */
  async findAll(filters?: AIPlayerFilters): Promise<AIPlayer[]> {
    let aiPlayers = Array.from(this.aiPlayers.values());

    if (filters) {
      if (filters.gameType) {
        aiPlayers = aiPlayers.filter((aiPlayer) => aiPlayer.isForGameType(filters.gameType!));
      }

      if (filters.strategyId) {
        aiPlayers = aiPlayers.filter((aiPlayer) => aiPlayer.usesStrategy(filters.strategyId!));
      }

      if (filters.difficulty) {
        aiPlayers = aiPlayers.filter((aiPlayer) => aiPlayer.difficulty === filters.difficulty);
      }
    }

    return aiPlayers;
  }

  /**
   * Update an existing AI player
   */
  async update(id: string, params: UpdateAIPlayerParams): Promise<AIPlayer> {
    const existingAIPlayer = this.aiPlayers.get(id);

    if (!existingAIPlayer) {
      throw new Error(`AI Player with ID ${id} not found`);
    }

    // Create updated AI player with new parameters
    const updatedAIPlayer = new AIPlayer(
      existingAIPlayer.id,
      params.name ?? existingAIPlayer.name,
      existingAIPlayer.gameType, // Game type cannot be changed
      params.strategyId ?? existingAIPlayer.strategyId,
      params.difficulty ?? existingAIPlayer.difficulty,
      params.configuration ?? existingAIPlayer.configuration,
      existingAIPlayer.createdAt // Preserve original creation date
    );

    this.aiPlayers.set(id, updatedAIPlayer);
    return updatedAIPlayer;
  }

  /**
   * Delete an AI player by ID
   */
  async delete(id: string): Promise<void> {
    const exists = this.aiPlayers.has(id);
    if (!exists) {
      throw new Error(`AI Player with ID ${id} not found`);
    }

    this.aiPlayers.delete(id);
  }

  /**
   * Check if an AI player exists
   */
  async exists(id: string): Promise<boolean> {
    return this.aiPlayers.has(id);
  }

  /**
   * Get count of AI players by game type
   */
  async countByGameType(gameType: string): Promise<number> {
    const aiPlayers = Array.from(this.aiPlayers.values());
    return aiPlayers.filter((aiPlayer) => aiPlayer.isForGameType(gameType)).length;
  }

  /**
   * Performs a health check on the repository
   * In-memory repository is always healthy
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
