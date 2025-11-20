import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameApi } from '../useGameApi';
import type { GameType } from '../../types/game';

// Mock the GameClient module
vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getGameTypes = vi.fn();
      createGame = vi.fn();
      getGame = vi.fn();
      listGames = vi.fn();
      joinGame = vi.fn();
      deleteGame = vi.fn();
      makeMove = vi.fn();
      getMoveHistory = vi.fn();
      getBoardSvgUrl = vi.fn();
    },
  };
});

describe('useGameApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading false and no error', () => {
    const { result } = renderHook(() => useGameApi());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.client).toBeDefined();
  });

  it('should set loading to false after API call completes', async () => {
    const { result } = renderHook(() => useGameApi());

    const mockGameTypes: GameType[] = [
      {
        type: 'tic-tac-toe',
        name: 'Tic-Tac-Toe',
        description: 'Classic game',
        minPlayers: 2,
        maxPlayers: 2,
      },
    ];

    vi.spyOn(result.current.client, 'getGameTypes').mockResolvedValue(mockGameTypes);

    const data = await result.current.execute(() => result.current.client.getGameTypes());

    // After completion, loading should be false
    expect(result.current.loading).toBe(false);
    expect(data).toEqual(mockGameTypes);
  });

  it('should set error when API call fails', async () => {
    const { result } = renderHook(() => useGameApi());

    const errorMessage = 'Network error';
    vi.spyOn(result.current.client, 'getGameTypes').mockRejectedValue(
      new Error(errorMessage)
    );

    const data = await result.current.execute(() => result.current.client.getGameTypes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(data).toBeNull();
    });
  });

  it('should clear error on successful API call after previous error', async () => {
    const { result } = renderHook(() => useGameApi());

    // First call fails
    vi.spyOn(result.current.client, 'getGameTypes').mockRejectedValueOnce(
      new Error('First error')
    );

    await result.current.execute(() => result.current.client.getGameTypes());

    await waitFor(() => {
      expect(result.current.error).toBe('First error');
    });

    // Second call succeeds
    const mockGameTypes: GameType[] = [];
    vi.spyOn(result.current.client, 'getGameTypes').mockResolvedValue(mockGameTypes);

    await result.current.execute(() => result.current.client.getGameTypes());

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it('should return data from successful API call', async () => {
    const { result } = renderHook(() => useGameApi());

    const mockGameTypes: GameType[] = [
      {
        type: 'tic-tac-toe',
        name: 'Tic-Tac-Toe',
        description: 'Classic game',
        minPlayers: 2,
        maxPlayers: 2,
      },
    ];

    vi.spyOn(result.current.client, 'getGameTypes').mockResolvedValue(mockGameTypes);

    const data = await result.current.execute(() => result.current.client.getGameTypes());

    expect(data).toEqual(mockGameTypes);
  });

  it('should handle multiple concurrent API calls', async () => {
    const { result } = renderHook(() => useGameApi());

    const mockGameTypes: GameType[] = [];
    vi.spyOn(result.current.client, 'getGameTypes').mockResolvedValue(mockGameTypes);
    vi.spyOn(result.current.client, 'listGames').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    const promise1 = result.current.execute(() => result.current.client.getGameTypes());
    const promise2 = result.current.execute(() => result.current.client.listGames());

    const [data1, data2] = await Promise.all([promise1, promise2]);

    expect(data1).toEqual(mockGameTypes);
    expect(data2).toBeDefined();
  });

  it('should reuse the same client instance across renders', () => {
    const { result, rerender } = renderHook(() => useGameApi());

    const firstClient = result.current.client;
    rerender();
    const secondClient = result.current.client;

    expect(firstClient).toBe(secondClient);
  });
});
