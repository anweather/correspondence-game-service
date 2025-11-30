import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameClient } from '../gameClient';
import type { GameState, GameType, Player, Move, GameConfig } from '../../types/game';

describe('GameClient', () => {
  let client: GameClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as any;
    client = new GameClient('/api');
  });

  describe('getGameTypes', () => {
    it('should fetch and return available game types', async () => {
      const mockGameTypes: GameType[] = [
        {
          type: 'tic-tac-toe',
          name: 'Tic-Tac-Toe',
          description: 'Classic 3x3 grid game',
          minPlayers: 2,
          maxPlayers: 2,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGameTypes,
      });

      const result = await client.getGameTypes();

      expect(mockFetch).toHaveBeenCalledWith('/api/game-types', expect.objectContaining({
        headers: expect.any(Headers),
      }));
      expect(result).toEqual(mockGameTypes);
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
      });

      await expect(client.getGameTypes()).rejects.toThrow('Server error');
    });
  });

  describe('createGame', () => {
    it('should create a new game and return game state', async () => {
      const mockGameState: GameState = {
        gameId: 'game-123',
        gameType: 'tic-tac-toe',
        lifecycle: 'created',
        players: [],
        currentPlayerIndex: 0,
        phase: 'setup',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const config: GameConfig = { customSettings: {} };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockGameState,
      });

      const result = await client.createGame('tic-tac-toe', config);

      expect(mockFetch).toHaveBeenCalledWith('/api/games', expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ gameType: 'tic-tac-toe', config }),
      }));
      expect(result).toEqual(mockGameState);
    });
  });

  describe('getGame', () => {
    it('should fetch and return a specific game', async () => {
      const mockGameState: GameState = {
        gameId: 'game-123',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [],
        currentPlayerIndex: 0,
        phase: 'playing',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGameState,
      });

      const result = await client.getGame('game-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/games/game-123', expect.objectContaining({
        headers: expect.any(Headers),
      }));
      expect(result).toEqual(mockGameState);
    });

    it('should throw error when game not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: { code: 'NOT_FOUND', message: 'Game not found' } }),
      });

      await expect(client.getGame('invalid-id')).rejects.toThrow('Game not found');
    });
  });

  describe('listGames', () => {
    it('should fetch and return paginated game list', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.listGames();

      expect(mockFetch).toHaveBeenCalledWith('/api/games', expect.objectContaining({
        headers: expect.any(Headers),
      }));
      expect(result).toEqual(mockResponse);
    });

    it('should include query parameters when filters provided', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.listGames({ lifecycle: 'active', page: 2, pageSize: 20 });

      expect(mockFetch).toHaveBeenCalledWith('/api/games?lifecycle=active&page=2&pageSize=20', expect.objectContaining({
        headers: expect.any(Headers),
      }));
    });
  });

  describe('joinGame', () => {
    it('should join a game and return updated game state', async () => {
      const player: Player = {
        id: 'player-1',
        name: 'Alice',
        joinedAt: '2024-01-01T00:00:00Z',
      };

      const mockGameState: GameState = {
        gameId: 'game-123',
        gameType: 'tic-tac-toe',
        lifecycle: 'waiting_for_players',
        players: [player],
        currentPlayerIndex: 0,
        phase: 'setup',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGameState,
      });

      const result = await client.joinGame('game-123', player);

      expect(mockFetch).toHaveBeenCalledWith('/api/games/game-123/join', expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ player }),
      }));
      expect(result).toEqual(mockGameState);
    });
  });

  describe('deleteGame', () => {
    it('should delete a game successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.deleteGame('game-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/games/game-123', expect.objectContaining({
        method: 'DELETE',
        headers: expect.any(Headers),
      }));
    });

    it('should throw error when delete fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: { code: 'NOT_FOUND', message: 'Game not found' } }),
      });

      await expect(client.deleteGame('invalid-id')).rejects.toThrow('Game not found');
    });
  });

  describe('makeMove', () => {
    it('should submit a move and return updated game state', async () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: '2024-01-01T00:00:00Z',
        action: 'place',
        parameters: { position: { x: 0, y: 0 } },
      };

      const mockGameState: GameState = {
        gameId: 'game-123',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [],
        currentPlayerIndex: 1,
        phase: 'playing',
        board: { spaces: [], metadata: {} },
        moveHistory: [move],
        metadata: {},
        version: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGameState,
      });

      const result = await client.makeMove('game-123', 'player-1', move, 2);

      expect(mockFetch).toHaveBeenCalledWith('/api/games/game-123/moves', expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ playerId: 'player-1', move, version: 2 }),
      }));
      expect(result).toEqual(mockGameState);
    });

    it('should throw error on concurrency conflict', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ error: { code: 'CONCURRENCY_ERROR', message: 'Game state changed' } }),
      });

      const move: Move = {
        playerId: 'player-1',
        timestamp: '2024-01-01T00:00:00Z',
        action: 'place',
        parameters: {},
      };

      await expect(client.makeMove('game-123', 'player-1', move, 1)).rejects.toThrow(
        'Game state changed'
      );
    });
  });

  describe('getMoveHistory', () => {
    it('should fetch and return move history', async () => {
      const mockMoves: Move[] = [
        {
          playerId: 'player-1',
          timestamp: '2024-01-01T00:00:00Z',
          action: 'place',
          parameters: { position: { x: 0, y: 0 } },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMoves,
      });

      const result = await client.getMoveHistory('game-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/games/game-123/moves', expect.objectContaining({
        headers: expect.any(Headers),
      }));
      expect(result).toEqual(mockMoves);
    });
  });

  describe('getBoardSvgUrl', () => {
    it('should return correct SVG URL', () => {
      const url = client.getBoardSvgUrl('game-123');
      expect(url).toBe('/api/games/game-123/board.svg');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getGameTypes()).rejects.toThrow('Network error');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        statusText: 'Internal Server Error',
      });

      await expect(client.getGameTypes()).rejects.toThrow('Internal Server Error');
    });
  });
});
