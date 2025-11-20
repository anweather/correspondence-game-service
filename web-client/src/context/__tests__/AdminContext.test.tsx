import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { AdminProvider, useAdmin } from '../AdminContext';
import type { GameState, GameType } from '../../types/game';

// Create mock functions that will be shared across all tests
const mockGetGameTypes = vi.fn();
const mockCreateGame = vi.fn();
const mockGetGame = vi.fn();
const mockListGames = vi.fn();
const mockJoinGame = vi.fn();
const mockDeleteGame = vi.fn();
const mockMakeMove = vi.fn();
const mockGetMoveHistory = vi.fn();
const mockGetBoardSvgUrl = vi.fn();

// Mock the GameClient module
vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getGameTypes = mockGetGameTypes;
      createGame = mockCreateGame;
      getGame = mockGetGame;
      listGames = mockListGames;
      joinGame = mockJoinGame;
      deleteGame = mockDeleteGame;
      makeMove = mockMakeMove;
      getMoveHistory = mockGetMoveHistory;
      getBoardSvgUrl = mockGetBoardSvgUrl;
    },
  };
});

describe('AdminContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AdminProvider>{children}</AdminProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('State Initialization', () => {
    it('should initialize with empty games array', () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      expect(result.current.games).toEqual([]);
      expect(result.current.selectedGame).toBeNull();
      expect(result.current.impersonatedPlayer).toBeNull();
      expect(result.current.filter).toBe('all');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('loadGames', () => {
    it('should load all games from API', async () => {
      const mockGames: GameState[] = [
        {
          gameId: 'game-1',
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
        },
      ];

      mockListGames.mockResolvedValue({
        items: mockGames,
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.loadGames();
      });

      await waitFor(() => {
        expect(result.current.games).toEqual(mockGames);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading state during API call', async () => {
      mockListGames.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAdmin(), { wrapper });

      act(() => {
        result.current.loadGames();
      });

      expect(result.current.loading).toBe(true);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Failed to load games';
      mockListGames.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.loadGames();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('selectGame', () => {
    it('should load and select a specific game', async () => {
      const mockGame: GameState = {
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
        ],
        currentPlayerIndex: 0,
        phase: 'playing',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockGetGame.mockResolvedValue(mockGame);

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.selectGame('game-1');
      });

      await waitFor(() => {
        expect(result.current.selectedGame).toEqual(mockGame);
      });
    });

    it('should handle errors when selecting game', async () => {
      const errorMessage = 'Game not found';
      mockGetGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.selectGame('invalid-game');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.selectedGame).toBeNull();
      });
    });
  });

  describe('createTestGame', () => {
    it('should create a new game and join as first player', async () => {
      const mockGame: GameState = {
        gameId: 'new-game',
        gameType: 'tic-tac-toe',
        lifecycle: 'waiting_for_players',
        players: [
          { id: 'player-1', name: 'Admin', joinedAt: '2024-01-01T00:00:00Z' },
        ],
        currentPlayerIndex: 0,
        phase: 'setup',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockCreateGame.mockResolvedValue(mockGame);
      mockJoinGame.mockResolvedValue(mockGame);
      mockListGames.mockResolvedValue({
        items: [mockGame],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.createTestGame('tic-tac-toe');
      });

      await waitFor(() => {
        expect(result.current.selectedGame).toEqual(mockGame);
      });
    });

    it('should handle errors during game creation', async () => {
      const errorMessage = 'Failed to create game';
      mockCreateGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.createTestGame('tic-tac-toe');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });
  });

  describe('addTestPlayer', () => {
    it('should add a player to the selected game', async () => {
      const initialGame: GameState = {
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: 'waiting_for_players',
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
        ],
        currentPlayerIndex: 0,
        phase: 'setup',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const updatedGame: GameState = {
        ...initialGame,
        players: [
          ...initialGame.players,
          { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
        ],
      };

      mockGetGame.mockResolvedValue(initialGame);
      mockJoinGame.mockResolvedValue(updatedGame);

      const { result } = renderHook(() => useAdmin(), { wrapper });

      // Select a game first
      await act(async () => {
        await result.current.selectGame('game-1');
      });

      await act(async () => {
        await result.current.addTestPlayer('Bob');
      });

      await waitFor(() => {
        expect(result.current.selectedGame?.players).toHaveLength(2);
        expect(result.current.selectedGame?.players[1].name).toBe('Bob');
      });
    });

    it('should handle errors when no game is selected', async () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.addTestPlayer('Bob');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('No game selected');
      });
    });
  });

  describe('impersonatePlayer', () => {
    it('should set the impersonated player ID', () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      act(() => {
        result.current.impersonatePlayer('player-1');
      });

      expect(result.current.impersonatedPlayer).toBe('player-1');
    });

    it('should clear impersonation when passed null', () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      act(() => {
        result.current.impersonatePlayer('player-1');
      });

      expect(result.current.impersonatedPlayer).toBe('player-1');

      act(() => {
        result.current.impersonatePlayer(null);
      });

      expect(result.current.impersonatedPlayer).toBeNull();
    });
  });

  describe('deleteGame', () => {
    it('should delete a game and remove it from the list', async () => {
      const mockGames: GameState[] = [
        {
          gameId: 'game-1',
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
        },
        {
          gameId: 'game-2',
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
        },
      ];

      mockListGames.mockResolvedValue({
        items: mockGames,
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      mockDeleteGame.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.loadGames();
      });

      await act(async () => {
        await result.current.deleteGame('game-1');
      });

      await waitFor(() => {
        expect(result.current.games).toHaveLength(1);
        expect(result.current.games[0].gameId).toBe('game-2');
      });
    });

    it('should clear selected game if it was deleted', async () => {
      const mockGame: GameState = {
        gameId: 'game-1',
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

      mockGetGame.mockResolvedValue(mockGame);
      mockDeleteGame.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.selectGame('game-1');
      });

      await act(async () => {
        await result.current.deleteGame('game-1');
      });

      await waitFor(() => {
        expect(result.current.selectedGame).toBeNull();
      });
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete game';
      mockDeleteGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await act(async () => {
        await result.current.deleteGame('game-1');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });
  });

  describe('setFilter', () => {
    it('should update the filter state', () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      act(() => {
        result.current.setFilter('active');
      });

      expect(result.current.filter).toBe('active');

      act(() => {
        result.current.setFilter('completed');
      });

      expect(result.current.filter).toBe('completed');
    });
  });
});
