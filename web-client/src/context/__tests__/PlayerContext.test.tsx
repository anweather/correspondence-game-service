import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PlayerProvider, usePlayer } from '../PlayerContext';
import type { GameState } from '../../types/game';

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

describe('PlayerContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PlayerProvider>{children}</PlayerProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('State Initialization', () => {
    it('should initialize with no current game', () => {
      const { result } = renderHook(() => usePlayer(), { wrapper });

      expect(result.current.currentGame).toBeNull();
      expect(result.current.playerId).toBeNull();
      expect(result.current.playerName).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should restore player data from localStorage', () => {
      localStorage.setItem('player.id', JSON.stringify('player-123'));
      localStorage.setItem('player.name', JSON.stringify('Alice'));
      localStorage.setItem('player.currentGame', JSON.stringify('game-456'));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      expect(result.current.playerId).toBe('player-123');
      expect(result.current.playerName).toBe('Alice');
    });
  });

  describe('createGame', () => {
    it('should create a new game and join as first player', async () => {
      const mockGame: GameState = {
        gameId: 'new-game',
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

      mockCreateGame.mockResolvedValue(mockGame);
      mockJoinGame.mockResolvedValue(mockGame);

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.createGame('tic-tac-toe', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.currentGame).toEqual(mockGame);
        expect(result.current.playerId).toBe('player-1');
        expect(result.current.playerName).toBe('Alice');
      });

      // Verify localStorage was updated
      expect(localStorage.getItem('player.id')).toBe(JSON.stringify('player-1'));
      expect(localStorage.getItem('player.name')).toBe(JSON.stringify('Alice'));
      expect(localStorage.getItem('player.currentGame')).toBe(JSON.stringify('new-game'));
    });

    it('should handle errors during game creation', async () => {
      const errorMessage = 'Failed to create game';
      mockCreateGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.createGame('tic-tac-toe', 'Alice');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.currentGame).toBeNull();
      });
    });
  });

  describe('joinGame', () => {
    it('should join an existing game', async () => {
      const mockGame: GameState = {
        gameId: 'existing-game',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
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

      mockJoinGame.mockResolvedValue(mockGame);

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.joinGame('existing-game', 'Bob');
      });

      await waitFor(() => {
        expect(result.current.currentGame).toEqual(mockGame);
        expect(result.current.playerId).toBe('player-2');
        expect(result.current.playerName).toBe('Bob');
      });

      // Verify localStorage was updated
      expect(localStorage.getItem('player.id')).toBe(JSON.stringify('player-2'));
      expect(localStorage.getItem('player.name')).toBe(JSON.stringify('Bob'));
      expect(localStorage.getItem('player.currentGame')).toBe(JSON.stringify('existing-game'));
    });

    it('should handle errors when joining game', async () => {
      const errorMessage = 'Game is full';
      mockJoinGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.joinGame('full-game', 'Charlie');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.currentGame).toBeNull();
      });
    });
  });

  describe('loadGame', () => {
    it('should load a game by ID', async () => {
      const mockGame: GameState = {
        gameId: 'game-123',
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

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.loadGame('game-123');
      });

      await waitFor(() => {
        expect(result.current.currentGame).toEqual(mockGame);
      });
    });

    it('should handle errors when loading game', async () => {
      const errorMessage = 'Game not found';
      mockGetGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.loadGame('invalid-game');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });
  });

  describe('submitMove', () => {
    it('should submit a move and update game state', async () => {
      const initialGame: GameState = {
        gameId: 'game-123',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
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

      const updatedGame: GameState = {
        ...initialGame,
        currentPlayerIndex: 1,
        version: 2,
        moveHistory: [
          {
            playerId: 'player-1',
            timestamp: '2024-01-01T00:02:00Z',
            action: 'place',
            parameters: { position: 0 },
          },
        ],
      };

      // Set up localStorage with player ID
      localStorage.setItem('player.id', JSON.stringify('player-1'));
      localStorage.setItem('player.name', JSON.stringify('Alice'));

      mockGetGame.mockResolvedValue(initialGame);
      mockMakeMove.mockResolvedValue(updatedGame);

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Load the game
      await act(async () => {
        await result.current.loadGame('game-123');
      });

      await act(async () => {
        await result.current.submitMove({
          action: 'place',
          parameters: { position: 0 },
        });
      });

      await waitFor(() => {
        expect(result.current.currentGame?.version).toBe(2);
        expect(result.current.currentGame?.currentPlayerIndex).toBe(1);
      });
    });

    it('should handle errors when no game is loaded', async () => {
      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.submitMove({
          action: 'place',
          parameters: { position: 0 },
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('No game loaded');
      });
    });

    it('should handle errors when no player ID is set', async () => {
      const mockGame: GameState = {
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

      mockGetGame.mockResolvedValue(mockGame);

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.loadGame('game-123');
      });

      await act(async () => {
        await result.current.submitMove({
          action: 'place',
          parameters: { position: 0 },
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('No player ID');
      });
    });

    it('should handle API errors during move submission', async () => {
      const mockGame: GameState = {
        gameId: 'game-123',
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

      const errorMessage = 'Invalid move';
      
      // Set up localStorage with player ID
      localStorage.setItem('player.id', JSON.stringify('player-1'));
      localStorage.setItem('player.name', JSON.stringify('Alice'));
      
      mockGetGame.mockResolvedValue(mockGame);
      mockMakeMove.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.loadGame('game-123');
      });

      await act(async () => {
        await result.current.submitMove({
          action: 'place',
          parameters: { position: 0 },
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });
  });

  describe('refreshGame', () => {
    it('should refresh the current game state', async () => {
      const initialGame: GameState = {
        gameId: 'game-123',
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

      const refreshedGame: GameState = {
        ...initialGame,
        version: 2,
        currentPlayerIndex: 1,
      };

      mockGetGame.mockResolvedValueOnce(initialGame).mockResolvedValueOnce(refreshedGame);

      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.loadGame('game-123');
      });

      expect(result.current.currentGame?.version).toBe(1);

      await act(async () => {
        await result.current.refreshGame();
      });

      await waitFor(() => {
        expect(result.current.currentGame?.version).toBe(2);
      });
    });

    it('should handle errors when no game is loaded', async () => {
      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.refreshGame();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('No game to refresh');
      });
    });
  });
});
