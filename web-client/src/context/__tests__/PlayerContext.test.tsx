import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PlayerProvider, usePlayer } from '../PlayerContext';
import type { GameState } from '../../types/game';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue(null) }),
}));

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
const mockGetOrCreatePlayerIdentity = vi.fn();
const mockGetKnownPlayers = vi.fn();
const mockGetProfile = vi.fn();
const mockUpdateProfile = vi.fn();
const mockCreateProfile = vi.fn();

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
      getOrCreatePlayerIdentity = mockGetOrCreatePlayerIdentity;
      getKnownPlayers = mockGetKnownPlayers;
      getProfile = mockGetProfile;
      updateProfile = mockUpdateProfile;
      createProfile = mockCreateProfile;
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
    // Default: no profile exists (404)
    mockGetProfile.mockRejectedValue({ status: 404 });
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

  describe('login/logout', () => {
    it('should login with a player name', async () => {
      mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-123', name: 'Alice' });
      
      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.login('Alice');
      });

      await waitFor(() => {
        expect(result.current.playerName).toBe('Alice');
      });
      expect(localStorage.getItem('player.name')).toBe(JSON.stringify('Alice'));
    });

    it('should logout and clear session', () => {
      localStorage.setItem('player.id', JSON.stringify('player-123'));
      localStorage.setItem('player.name', JSON.stringify('Alice'));
      localStorage.setItem('player.currentGame', JSON.stringify('game-456'));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      act(() => {
        result.current.logout();
      });

      expect(result.current.playerName).toBeNull();
      expect(result.current.playerId).toBeNull();
      expect(result.current.currentGame).toBeNull();
      // useLocalStorage removes keys when value is null
      expect(localStorage.getItem('player.name')).toBeNull();
      expect(localStorage.getItem('player.id')).toBeNull();
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

      mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-1', name: 'Alice' });
      mockCreateGame.mockResolvedValue(mockGame);
      mockJoinGame.mockResolvedValue(mockGame);

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.login('Alice');
      });

      await act(async () => {
        await result.current.createGame('tic-tac-toe');
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
      mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-1', name: 'Alice' });
      mockCreateGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.login('Alice');
      });

      await act(async () => {
        await result.current.createGame('tic-tac-toe');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.currentGame).toBeNull();
      });
    });

    it('should require login before creating game', async () => {
      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.createGame('tic-tac-toe');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Please login first');
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

      mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-2', name: 'Bob' });
      mockJoinGame.mockResolvedValue(mockGame);

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.login('Bob');
      });

      await act(async () => {
        await result.current.joinGame('existing-game');
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
      mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-3', name: 'Charlie' });
      mockJoinGame.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.login('Charlie');
      });

      await act(async () => {
        await result.current.joinGame('full-game');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.currentGame).toBeNull();
      });
    });

    it('should require login before joining game', async () => {
      const { result } = renderHook(() => usePlayer(), { wrapper });

      await act(async () => {
        await result.current.joinGame('existing-game');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Please login first');
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

  describe('Profile Integration', () => {
    it('should expose display name from profile', () => {
      // Set up cached profile
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Should have access to display name
      expect(result.current.displayName).toBeDefined();
    });

    it('should use display name instead of player name when available', async () => {
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));
      localStorage.setItem('player.name', JSON.stringify('OldName'));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Display name should take precedence
      expect(result.current.displayName).toBe('CoolPlayer');
    });

    it('should fall back to player name when no profile exists', () => {
      localStorage.setItem('player.name', JSON.stringify('Alice'));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Should fall back to player name
      expect(result.current.displayName).toBe('Alice');
    });

    it('should cache profile data in localStorage', () => {
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Profile should be loaded from cache
      expect(result.current.displayName).toBe('CoolPlayer');
      expect(localStorage.getItem('playerProfile')).toBeTruthy();
    });
  });

  describe('Authentication Loading State', () => {
    it('should not show loading state for returning users with cached profile', () => {
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));
      localStorage.setItem('player.id', JSON.stringify('user-123'));

      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Should not be in loading state since profile is cached
      expect(result.current.isNewUser).toBe(false);
    });

    it('should identify new users without cached profile', () => {
      const { result } = renderHook(() => usePlayer(), { wrapper });

      // Should identify as new user
      expect(result.current.isNewUser).toBe(true);
    });

    it('should distinguish between initial auth and returning user', () => {
      // First render - new user
      const { result: result1 } = renderHook(() => usePlayer(), { wrapper });
      expect(result1.current.isNewUser).toBe(true);

      // Set up profile
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));

      // Second render - returning user
      const { result: result2 } = renderHook(() => usePlayer(), { wrapper });
      expect(result2.current.isNewUser).toBe(false);
    });

    it('should cache player identity to prevent re-initialization', () => {
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));
      localStorage.setItem('player.id', JSON.stringify('user-123'));

      const { result, rerender } = renderHook(() => usePlayer(), { wrapper });

      const initialDisplayName = result.current.displayName;

      // Rerender should not cause re-initialization
      rerender();

      expect(result.current.displayName).toBe(initialDisplayName);
      expect(result.current.isNewUser).toBe(false);
    });
  });

  describe('Display Name Usage', () => {
    it('should use display name in game creation', async () => {
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));
      localStorage.setItem('player.id', JSON.stringify('user-123'));

      const mockGame: GameState = {
        gameId: 'new-game',
        gameType: 'tic-tac-toe',
        lifecycle: 'waiting_for_players',
        players: [
          { id: 'user-123', name: 'CoolPlayer', joinedAt: '2024-01-01T00:00:00Z' },
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
        await result.current.createGame('tic-tac-toe');
      });

      await waitFor(() => {
        expect(mockJoinGame).toHaveBeenCalledWith(
          'new-game',
          expect.objectContaining({
            id: 'user-123',
            name: 'CoolPlayer',
          })
        );
      });
    });

    it('should use display name in game joining', async () => {
      const mockProfile = {
        userId: 'user-123',
        displayName: 'CoolPlayer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('playerProfile', JSON.stringify(mockProfile));
      localStorage.setItem('player.id', JSON.stringify('user-123'));

      const mockGame: GameState = {
        gameId: 'existing-game',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [
          { id: 'user-123', name: 'CoolPlayer', joinedAt: '2024-01-01T00:00:00Z' },
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
        await result.current.joinGame('existing-game');
      });

      await waitFor(() => {
        expect(mockJoinGame).toHaveBeenCalledWith(
          'existing-game',
          expect.objectContaining({
            id: 'user-123',
            name: 'CoolPlayer',
          })
        );
      });
    });
  });
});
