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

    it('should create a game with name and description', async () => {
      const mockGameState: GameState = {
        gameId: 'game-123',
        gameType: 'tic-tac-toe',
        lifecycle: 'created',
        players: [],
        currentPlayerIndex: 0,
        phase: 'setup',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {
          gameName: 'Epic Battle',
          gameDescription: 'A friendly match between rivals',
        },
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const config: GameConfig = {
        customSettings: {},
        gameName: 'Epic Battle',
        gameDescription: 'A friendly match between rivals',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockGameState,
      });

      const result = await client.createGame('tic-tac-toe', config);

      expect(mockFetch).toHaveBeenCalledWith('/api/games', expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ 
          gameType: 'tic-tac-toe', 
          config: { customSettings: {} },
          gameName: 'Epic Battle',
          gameDescription: 'A friendly match between rivals'
        }),
      }));
      expect(result.metadata.gameName).toBe('Epic Battle');
      expect(result.metadata.gameDescription).toBe('A friendly match between rivals');
    });

    it('should throw error when game name is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Game name is required' }),
      });

      const config: GameConfig = { customSettings: {} };

      await expect(client.createGame('tic-tac-toe', config)).rejects.toThrow('Game name is required');
    });

    it('should throw error when description exceeds max length', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Description must not exceed 500 characters' }),
      });

      const config: GameConfig = {
        customSettings: {},
        gameName: 'Test Game',
        gameDescription: 'x'.repeat(501),
      };

      await expect(client.createGame('tic-tac-toe', config)).rejects.toThrow('Description must not exceed 500 characters');
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

  describe('profile API methods', () => {
    describe('createProfile', () => {
      it('should create a profile with provided display name', async () => {
        const mockResponse = {
          userId: 'user-123',
          displayName: 'TestUser',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => mockResponse,
        });

        const result = await client.createProfile('TestUser');

        expect(mockFetch).toHaveBeenCalledWith('/api/players/profile', expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          body: JSON.stringify({ displayName: 'TestUser' }),
        }));
        expect(result.userId).toBe('user-123');
        expect(result.displayName).toBe('TestUser');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });

      it('should create a profile without display name (default generation)', async () => {
        const mockResponse = {
          userId: 'user-123',
          displayName: 'player123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => mockResponse,
        });

        const result = await client.createProfile();

        expect(mockFetch).toHaveBeenCalledWith('/api/players/profile', expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          body: JSON.stringify({}),
        }));
        expect(result.displayName).toBe('player123');
      });

      it('should throw error when display name is invalid', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: 'Display name must be 3-50 characters' }),
        });

        await expect(client.createProfile('ab')).rejects.toThrow('Display name must be 3-50 characters');
      });

      it('should throw error when display name is already taken', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 409,
          statusText: 'Conflict',
          json: async () => ({ error: 'Display name already taken' }),
        });

        await expect(client.createProfile('ExistingUser')).rejects.toThrow('Display name already taken');
      });
    });

    describe('getProfile', () => {
      it('should fetch current user profile', async () => {
        const mockResponse = {
          userId: 'user-123',
          displayName: 'TestUser',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await client.getProfile();

        expect(mockFetch).toHaveBeenCalledWith('/api/players/profile', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result.userId).toBe('user-123');
        expect(result.displayName).toBe('TestUser');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });

      it('should throw error when profile not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: 'Profile not found' }),
        });

        await expect(client.getProfile()).rejects.toThrow('Profile not found');
      });

      it('should throw error when not authenticated', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: 'Authentication required' }),
        });

        await expect(client.getProfile()).rejects.toThrow('Authentication required');
      });
    });

    describe('updateProfile', () => {
      it('should update profile display name', async () => {
        const mockResponse = {
          userId: 'user-123',
          displayName: 'NewDisplayName',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await client.updateProfile('NewDisplayName');

        expect(mockFetch).toHaveBeenCalledWith('/api/players/profile', expect.objectContaining({
          method: 'PUT',
          headers: expect.any(Headers),
          body: JSON.stringify({ displayName: 'NewDisplayName' }),
        }));
        expect(result.displayName).toBe('NewDisplayName');
        expect(result.updatedAt).toBeInstanceOf(Date);
      });

      it('should throw error when display name is invalid', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: 'Display name must be 3-50 characters' }),
        });

        await expect(client.updateProfile('ab')).rejects.toThrow('Display name must be 3-50 characters');
      });

      it('should throw error when display name is already taken', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 409,
          statusText: 'Conflict',
          json: async () => ({ error: 'Display name already taken' }),
        });

        await expect(client.updateProfile('ExistingUser')).rejects.toThrow('Display name already taken');
      });
    });

    describe('getPublicProfile', () => {
      it('should fetch public profile by user ID', async () => {
        const mockResponse = {
          userId: 'user-456',
          displayName: 'OtherUser',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await client.getPublicProfile('user-456');

        expect(mockFetch).toHaveBeenCalledWith('/api/players/user-456/profile', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result.userId).toBe('user-456');
        expect(result.displayName).toBe('OtherUser');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });

      it('should throw error when profile not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: 'Profile not found' }),
        });

        await expect(client.getPublicProfile('invalid-user')).rejects.toThrow('Profile not found');
      });
    });
  });

  describe('stats API methods', () => {
    describe('getPlayerStats', () => {
      it('should fetch overall player stats', async () => {
        const mockStats = {
          userId: 'user-123',
          totalGames: 42,
          wins: 28,
          losses: 12,
          draws: 2,
          winRate: 0.7,
          totalTurns: 1234,
          averageTurnsPerGame: 29.4,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        });

        const result = await client.getPlayerStats();

        expect(mockFetch).toHaveBeenCalledWith('/api/players/stats', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockStats);
      });

      it('should fetch stats for specific game type', async () => {
        const mockStats = {
          userId: 'user-123',
          gameType: 'tic-tac-toe',
          totalGames: 20,
          wins: 15,
          losses: 5,
          draws: 0,
          winRate: 0.75,
          totalTurns: 180,
          averageTurnsPerGame: 9,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        });

        const result = await client.getPlayerStats('tic-tac-toe');

        expect(mockFetch).toHaveBeenCalledWith('/api/players/stats/tic-tac-toe', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockStats);
      });

      it('should throw error when not authenticated', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: 'Authentication required' }),
        });

        await expect(client.getPlayerStats()).rejects.toThrow('Authentication required');
      });
    });

    describe('getGameHistory', () => {
      it('should fetch game history without filters', async () => {
        const mockHistory = {
          items: [
            {
              gameId: 'game-1',
              gameType: 'tic-tac-toe',
              lifecycle: 'completed',
              players: [],
              currentPlayerIndex: 0,
              phase: 'completed',
              board: { spaces: [], metadata: {} },
              moveHistory: [],
              metadata: {},
              version: 10,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T01:00:00Z',
              winner: 'player-1',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockHistory,
        });

        const result = await client.getGameHistory();

        expect(mockFetch).toHaveBeenCalledWith('/api/players/history', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockHistory);
      });

      it('should fetch game history with filters', async () => {
        const mockHistory = {
          items: [],
          total: 0,
          page: 2,
          pageSize: 20,
          totalPages: 0,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockHistory,
        });

        const result = await client.getGameHistory({
          gameType: 'connect-four',
          lifecycle: 'completed',
          page: 2,
          pageSize: 20,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/players/history?gameType=connect-four&lifecycle=completed&page=2&pageSize=20',
          expect.objectContaining({
            headers: expect.any(Headers),
          })
        );
        expect(result).toEqual(mockHistory);
      });

      it('should throw error when not authenticated', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: 'Authentication required' }),
        });

        await expect(client.getGameHistory()).rejects.toThrow('Authentication required');
      });
    });

    describe('getLeaderboard', () => {
      it('should fetch overall leaderboard', async () => {
        const mockLeaderboard = {
          items: [
            {
              rank: 1,
              userId: 'user-1',
              displayName: 'TopPlayer',
              totalGames: 50,
              wins: 42,
              losses: 8,
              winRate: 0.84,
            },
            {
              rank: 2,
              userId: 'user-2',
              displayName: 'SecondPlace',
              totalGames: 45,
              wins: 35,
              losses: 10,
              winRate: 0.778,
            },
          ],
          total: 2,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeaderboard,
        });

        const result = await client.getLeaderboard();

        expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockLeaderboard);
      });

      it('should fetch leaderboard for specific game type', async () => {
        const mockLeaderboard = {
          items: [
            {
              rank: 1,
              userId: 'user-1',
              displayName: 'TicTacToeChamp',
              totalGames: 30,
              wins: 25,
              losses: 5,
              winRate: 0.833,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeaderboard,
        });

        const result = await client.getLeaderboard('tic-tac-toe');

        expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard/tic-tac-toe', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockLeaderboard);
      });

      it('should fetch leaderboard with pagination', async () => {
        const mockLeaderboard = {
          items: [],
          total: 100,
          page: 2,
          pageSize: 25,
          totalPages: 4,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeaderboard,
        });

        const result = await client.getLeaderboard(undefined, { page: 2, pageSize: 25 });

        expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard?page=2&pageSize=25', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockLeaderboard);
      });
    });
  });

  describe('invitation API methods', () => {
    describe('createInvitation', () => {
      it('should create an invitation', async () => {
        const mockInvitation = {
          invitationId: 'inv-123',
          gameId: 'game-123',
          inviterId: 'user-1',
          inviteeId: 'user-2',
          status: 'pending' as const,
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => mockInvitation,
        });

        const result = await client.createInvitation('game-123', 'user-2');

        expect(mockFetch).toHaveBeenCalledWith('/api/invitations', expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          body: JSON.stringify({ gameId: 'game-123', inviteeId: 'user-2' }),
        }));
        expect(result).toEqual(mockInvitation);
      });

      it('should throw error when invitee not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: 'Invitee not found' }),
        });

        await expect(client.createInvitation('game-123', 'invalid-user')).rejects.toThrow('Invitee not found');
      });

      it('should throw error when game not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: 'Game not found' }),
        });

        await expect(client.createInvitation('invalid-game', 'user-2')).rejects.toThrow('Game not found');
      });
    });

    describe('getInvitations', () => {
      it('should fetch all invitations', async () => {
        const mockInvitations = [
          {
            invitationId: 'inv-1',
            gameId: 'game-1',
            inviterId: 'user-1',
            inviteeId: 'user-2',
            status: 'pending' as const,
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            invitationId: 'inv-2',
            gameId: 'game-2',
            inviterId: 'user-3',
            inviteeId: 'user-2',
            status: 'accepted' as const,
            createdAt: '2024-01-02T00:00:00Z',
            respondedAt: '2024-01-02T01:00:00Z',
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockInvitations,
        });

        const result = await client.getInvitations();

        expect(mockFetch).toHaveBeenCalledWith('/api/invitations', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockInvitations);
      });

      it('should fetch invitations filtered by status', async () => {
        const mockInvitations = [
          {
            invitationId: 'inv-1',
            gameId: 'game-1',
            inviterId: 'user-1',
            inviteeId: 'user-2',
            status: 'pending' as const,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockInvitations,
        });

        const result = await client.getInvitations('pending');

        expect(mockFetch).toHaveBeenCalledWith('/api/invitations?status=pending', expect.objectContaining({
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockInvitations);
      });

      it('should throw error when not authenticated', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: 'Authentication required' }),
        });

        await expect(client.getInvitations()).rejects.toThrow('Authentication required');
      });
    });

    describe('acceptInvitation', () => {
      it('should accept an invitation', async () => {
        const mockInvitation = {
          invitationId: 'inv-123',
          gameId: 'game-123',
          inviterId: 'user-1',
          inviteeId: 'user-2',
          status: 'accepted' as const,
          createdAt: '2024-01-01T00:00:00Z',
          respondedAt: '2024-01-01T01:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockInvitation,
        });

        const result = await client.acceptInvitation('inv-123');

        expect(mockFetch).toHaveBeenCalledWith('/api/invitations/inv-123/accept', expect.objectContaining({
          method: 'PUT',
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockInvitation);
      });

      it('should throw error when invitation not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: 'Invitation not found' }),
        });

        await expect(client.acceptInvitation('invalid-inv')).rejects.toThrow('Invitation not found');
      });
    });

    describe('declineInvitation', () => {
      it('should decline an invitation', async () => {
        const mockInvitation = {
          invitationId: 'inv-123',
          gameId: 'game-123',
          inviterId: 'user-1',
          inviteeId: 'user-2',
          status: 'declined' as const,
          createdAt: '2024-01-01T00:00:00Z',
          respondedAt: '2024-01-01T01:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockInvitation,
        });

        const result = await client.declineInvitation('inv-123');

        expect(mockFetch).toHaveBeenCalledWith('/api/invitations/inv-123/decline', expect.objectContaining({
          method: 'PUT',
          headers: expect.any(Headers),
        }));
        expect(result).toEqual(mockInvitation);
      });

      it('should throw error when invitation not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: 'Invitation not found' }),
        });

        await expect(client.declineInvitation('invalid-inv')).rejects.toThrow('Invitation not found');
      });
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
