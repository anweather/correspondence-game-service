import fetch from 'node-fetch';

interface ApiClientOptions {
  baseUrl: string;
  userId?: string;
}

export class ApiClient {
  private baseUrl: string;
  private userId?: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.userId = options.userId;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.userId) {
      headers['x-test-user-id'] = this.userId;
    }

    return headers;
  }

  async createGame(gameType: string, config?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/games`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ gameType, config }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create game: ${response.statusText}`);
    }

    return response.json();
  }

  async joinGame(gameId: string, player: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/games/${gameId}/join`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ player }),
    });

    if (!response.ok) {
      throw new Error(`Failed to join game: ${response.statusText}`);
    }

    return response.json();
  }

  async makeMove(gameId: string, playerId: string, move: any, version: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/games/${gameId}/moves`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ playerId, move, version }),
    });

    if (!response.ok) {
      throw new Error(`Failed to make move: ${response.statusText}`);
    }

    return response.json();
  }

  async getGameState(gameId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/games/${gameId}/state`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get game state: ${response.statusText}`);
    }

    return response.json();
  }

  async getStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/players/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Stats response status:', response.status);
      console.log('Stats response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Stats response body:', errorText);
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    return response.json();
  }
}