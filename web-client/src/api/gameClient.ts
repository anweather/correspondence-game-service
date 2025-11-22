import type {
  GameState,
  GameType,
  Player,
  Move,
  MoveInput,
  GameConfig,
  GameFilters,
  GameListResponse,
} from '../types/game';

/**
 * API client for the Async Boardgame Service
 * Wraps all REST API calls with consistent error handling
 */
export class GameClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all available game types
   */
  async getGameTypes(): Promise<GameType[]> {
    return this.request<GameType[]>(`${this.baseUrl}/game-types`);
  }

  /**
   * Create a new game instance
   */
  async createGame(gameType: string, config: GameConfig): Promise<GameState> {
    return this.request<GameState>(`${this.baseUrl}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType, config }),
    });
  }

  /**
   * Get a specific game by ID
   */
  async getGame(gameId: string): Promise<GameState> {
    return this.request<GameState>(`${this.baseUrl}/games/${gameId}`);
  }

  /**
   * List games with optional filters
   */
  async listGames(filters?: GameFilters): Promise<GameListResponse> {
    const queryParams = this.buildQueryParams(filters);
    const url = queryParams ? `${this.baseUrl}/games?${queryParams}` : `${this.baseUrl}/games`;
    return this.request<GameListResponse>(url);
  }

  /**
   * Join a game as a player
   */
  async joinGame(gameId: string, player: Player): Promise<GameState> {
    return this.request<GameState>(`${this.baseUrl}/games/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player }),
    });
  }

  /**
   * Delete a game
   */
  async deleteGame(gameId: string): Promise<void> {
    await this.request<void>(`${this.baseUrl}/games/${gameId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Make a move in a game
   */
  async makeMove(
    gameId: string,
    playerId: string,
    move: MoveInput,
    version: number
  ): Promise<GameState> {
    return this.request<GameState>(`${this.baseUrl}/games/${gameId}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, move, version }),
    });
  }

  /**
   * Get move history for a game
   */
  async getMoveHistory(gameId: string): Promise<Move[]> {
    return this.request<Move[]>(`${this.baseUrl}/games/${gameId}/moves`);
  }

  /**
   * Get URL for board SVG rendering
   */
  getBoardSvgUrl(gameId: string): string {
    return `${this.baseUrl}/games/${gameId}/board.svg`;
  }

  /**
   * Get or create player identity by name
   */
  async getOrCreatePlayerIdentity(name: string): Promise<{ id: string; name: string }> {
    return this.request<{ id: string; name: string }>(`${this.baseUrl}/players/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Get list of known player names
   */
  async getKnownPlayers(): Promise<{ players: Array<{ name: string; lastUsed: string }> }> {
    return this.request<{ players: Array<{ name: string; lastUsed: string }> }>(
      `${this.baseUrl}/players/known`
    );
  }

  /**
   * Generic request handler with error handling
   */
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  /**
   * Handle error responses from the API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage: string;
    
    try {
      const errorData = await response.json();
      
      // Handle different error response formats
      if (errorData.error && typeof errorData.error === 'object') {
        // Format: { error: { code: "...", message: "..." } }
        errorMessage = errorData.error.message || errorData.error.code || 'Request failed';
      } else if (errorData.error && typeof errorData.error === 'string') {
        // Format: { error: "..." }
        errorMessage = errorData.error;
      } else if (errorData.message) {
        // Format: { message: "..." }
        errorMessage = errorData.message;
      } else {
        // Fallback
        errorMessage = response.statusText || 'Request failed';
      }
    } catch {
      // If JSON parsing fails, use statusText
      errorMessage = response.statusText || 'Request failed';
    }
    
    throw new Error(errorMessage);
  }

  /**
   * Build query string from filters object
   */
  private buildQueryParams(filters?: GameFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.playerId) params.append('playerId', filters.playerId);
    if (filters.gameType) params.append('gameType', filters.gameType);
    if (filters.lifecycle) params.append('lifecycle', filters.lifecycle);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.pageSize !== undefined) params.append('pageSize', filters.pageSize.toString());

    return params.toString();
  }
}
