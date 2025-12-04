import process from 'process';
import type {
  GameState,
  GameType,
  Player,
  Move,
  MoveInput,
  GameConfig,
  GameFilters,
  GameListResponse,
  PlayerStats,
  LeaderboardEntry,
  PaginatedResult,
  GameHistoryFilters,
  GameInvitation,
  InvitationStatus,
} from '../types/game';

/**
 * API client for the Async Boardgame Service
 * Wraps all REST API calls with consistent error handling
 */
export class GameClient {
  private baseUrl: string;
  private getToken?: () => Promise<string | null>;
  
  constructor(baseUrl: string = '/api', getToken?: () => Promise<string | null>) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
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
   * Get current player's profile
   */
  async getProfile(): Promise<{
    userId: string;
    displayName: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const response = await this.request<{
      userId: string;
      displayName: string;
      createdAt: string;
      updatedAt: string;
    }>(`${this.baseUrl}/players/profile`);
    
    // Convert date strings to Date objects
    return {
      ...response,
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt),
    };
  }

  /**
   * Create player profile
   */
  async createProfile(displayName?: string): Promise<{
    userId: string;
    displayName: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const response = await this.request<{
      userId: string;
      displayName: string;
      createdAt: string;
      updatedAt: string;
    }>(`${this.baseUrl}/players/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(displayName ? { displayName } : {}),
    });
    
    // Convert date strings to Date objects
    return {
      ...response,
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt),
    };
  }

  /**
   * Update player profile
   */
  async updateProfile(displayName: string): Promise<{
    userId: string;
    displayName: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const response = await this.request<{
      userId: string;
      displayName: string;
      createdAt: string;
      updatedAt: string;
    }>(`${this.baseUrl}/players/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    
    // Convert date strings to Date objects
    return {
      ...response,
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt),
    };
  }

  /**
   * Get public profile by user ID
   */
  async getPublicProfile(userId: string): Promise<{
    userId: string;
    displayName: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const response = await this.request<{
      userId: string;
      displayName: string;
      createdAt: string;
      updatedAt: string;
    }>(`${this.baseUrl}/players/${userId}/profile`);
    
    // Convert date strings to Date objects
    return {
      ...response,
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt),
    };
  }

  /**
   * List all player profiles
   * Note: This is a temporary implementation that uses the games list to find players
   * In a production system, there should be a dedicated endpoint for listing all players
   */
  async listAllPlayers(): Promise<Array<{ userId: string; displayName: string }>> {
    // For now, we'll return an empty array since there's no backend endpoint
    // This will be populated when the backend adds a list players endpoint
    // The invitation modal will still work with an empty list
    return [];
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(gameType?: string): Promise<PlayerStats> {
    const url = gameType
      ? `${this.baseUrl}/players/stats/${gameType}`
      : `${this.baseUrl}/players/stats`;
    return this.request<PlayerStats>(url);
  }

  /**
   * Get game history for current player
   */
  async getGameHistory(filters?: GameHistoryFilters): Promise<PaginatedResult<GameState>> {
    const queryParams = this.buildHistoryQueryParams(filters);
    const url = queryParams
      ? `${this.baseUrl}/players/history?${queryParams}`
      : `${this.baseUrl}/players/history`;
    return this.request<PaginatedResult<GameState>>(url);
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    gameType?: string,
    pagination?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResult<LeaderboardEntry>> {
    let url = gameType
      ? `${this.baseUrl}/leaderboard/${gameType}`
      : `${this.baseUrl}/leaderboard`;
    
    if (pagination) {
      const params = new URLSearchParams();
      if (pagination.page !== undefined) params.append('page', pagination.page.toString());
      if (pagination.pageSize !== undefined) params.append('pageSize', pagination.pageSize.toString());
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }
    
    return this.request<PaginatedResult<LeaderboardEntry>>(url);
  }

  /**
   * Create a game invitation
   */
  async createInvitation(gameId: string, inviteeId: string): Promise<GameInvitation> {
    return this.request<GameInvitation>(`${this.baseUrl}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, inviteeId }),
    });
  }

  /**
   * Get invitations for current user
   */
  async getInvitations(status?: InvitationStatus): Promise<GameInvitation[]> {
    const url = status
      ? `${this.baseUrl}/invitations?status=${status}`
      : `${this.baseUrl}/invitations`;
    return this.request<GameInvitation[]>(url);
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: string): Promise<GameInvitation> {
    return this.request<GameInvitation>(`${this.baseUrl}/invitations/${invitationId}/accept`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string): Promise<GameInvitation> {
    return this.request<GameInvitation>(`${this.baseUrl}/invitations/${invitationId}/decline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Generic request handler with error handling
   */
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      // Get Clerk session token if available
      const token = this.getToken ? await this.getToken() : null;
      
      // Add Authorization header if token exists
      const headers = new Headers(options?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

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
    
    // Create error with status code
    const error: any = new Error(errorMessage);
    error.status = response.status;
    throw error;
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

  /**
   * Build query string from history filters object
   */
  private buildHistoryQueryParams(filters?: GameHistoryFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.gameType) params.append('gameType', filters.gameType);
    if (filters.lifecycle) params.append('lifecycle', filters.lifecycle);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.pageSize !== undefined) params.append('pageSize', filters.pageSize.toString());

    return params.toString();
  }
}
