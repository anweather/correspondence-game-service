# Task: Implement Blackbox API Tests

## Overview
Create a simple blackbox API test suite that treats the API as an external service. Tests the complete happy path flow assuming the server is already running.

## Test Flow
1. Create a new Tic-Tac-Toe game
2. Join game as second player  
3. Complete game by alternating turns (win scenario)
4. Call the stats API after game completion
5. Verify stats accuracy

## Authentication
Using test mode bypass with `x-test-user-id` header - simple and fast.

## Implementation

### API Client Helper

**File:** `tests/blackbox/apiClient.ts`
```typescript
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
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### Main Test Suite

**File:** `tests/blackbox/gameFlow.blackbox.test.ts`
```typescript
import { ApiClient } from './apiClient';

const API_BASE_URL = 'http://localhost:3000'; // Assume server is running

describe('Blackbox API Tests - Complete Game Flow', () => {
  let player1Client: ApiClient;
  let player2Client: ApiClient;

  beforeAll(() => {
    player1Client = new ApiClient({
      baseUrl: API_BASE_URL,
      userId: 'blackbox-player-1',
    });

    player2Client = new ApiClient({
      baseUrl: API_BASE_URL,
      userId: 'blackbox-player-2',
    });
  });

  describe('Happy Path: Create, Play, Complete, and View Stats', () => {
    let gameId: string;
    let gameVersion: number;

    it('should create a new Tic-Tac-Toe game', async () => {
      const game = await player1Client.createGame('tic-tac-toe', {
        players: [
          {
            id: 'blackbox-player-1',
            name: 'Alice',
            joinedAt: new Date().toISOString(),
          },
        ],
      });

      expect(game).toHaveProperty('gameId');
      expect(game).toHaveProperty('gameType', 'tic-tac-toe');
      expect(game).toHaveProperty('lifecycle', 'waiting_for_players');

      gameId = game.gameId;
      gameVersion = game.version;
    });

    it('should allow second player to join the game', async () => {
      const game = await player2Client.joinGame(gameId, {
        id: 'blackbox-player-2',
        name: 'Bob',
        joinedAt: new Date().toISOString(),
      });

      expect(game.lifecycle).toBe('active');
      expect(game.players).toHaveLength(2);
      gameVersion = game.version;
    });

    it('should complete a game with alternating turns (Alice wins)', async () => {
      // Alice wins with top row: (0,0), (0,1), (0,2)
      // Bob plays: (1,0), (1,1)

      // Move 1: Alice (0,0)
      let gameState = await player1Client.makeMove(
        gameId,
        'blackbox-player-1',
        {
          action: 'place',
          parameters: { row: 0, col: 0 },
          playerId: 'blackbox-player-1',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 2: Bob (1,0)
      gameState = await player2Client.makeMove(
        gameId,
        'blackbox-player-2',
        {
          action: 'place',
          parameters: { row: 1, col: 0 },
          playerId: 'blackbox-player-2',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 3: Alice (0,1)
      gameState = await player1Client.makeMove(
        gameId,
        'blackbox-player-1',
        {
          action: 'place',
          parameters: { row: 0, col: 1 },
          playerId: 'blackbox-player-1',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 4: Bob (1,1)
      gameState = await player2Client.makeMove(
        gameId,
        'blackbox-player-2',
        {
          action: 'place',
          parameters: { row: 1, col: 1 },
          playerId: 'blackbox-player-2',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );
      gameVersion = gameState.version;

      // Move 5: Alice (0,2) - WINNING MOVE
      gameState = await player1Client.makeMove(
        gameId,
        'blackbox-player-1',
        {
          action: 'place',
          parameters: { row: 0, col: 2 },
          playerId: 'blackbox-player-1',
          timestamp: new Date().toISOString(),
        },
        gameVersion
      );

      expect(gameState.lifecycle).toBe('completed');
      expect(gameState.winner).toBe('blackbox-player-1');
    });

    it('should retrieve accurate stats after game completion', async () => {
      const aliceStats = await player1Client.getStats();

      expect(aliceStats).toHaveProperty('totalGames');
      expect(aliceStats.totalGames).toBeGreaterThanOrEqual(1);
      expect(aliceStats).toHaveProperty('wins');
      expect(aliceStats.wins).toBeGreaterThanOrEqual(1);

      const bobStats = await player2Client.getStats();
      expect(bobStats.losses).toBeGreaterThanOrEqual(1);
    });
  });
});
```

### Jest Config

**File:** `jest.blackbox.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/blackbox'],
  testMatch: ['**/*.blackbox.test.ts'],
  testTimeout: 10000,
};
```

### Package.json Scripts
```json
{
  "scripts": {
    "test:blackbox": "jest --config jest.blackbox.config.js"
  }
}
```

## Dependencies
```bash
npm install --save-dev node-fetch@2 @types/node-fetch
```

## Usage
1. Start the server: `npm run dev`
2. Run blackbox tests: `npm run test:blackbox`

Simple and focused on the happy path flow.
