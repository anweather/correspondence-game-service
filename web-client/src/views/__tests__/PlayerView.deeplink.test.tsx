import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { PlayerView } from '../PlayerView';
import { PlayerProvider } from '../../context/PlayerContext';
import { WebSocketProvider } from '../../context/WebSocketContext';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user' }, isSignedIn: true }),
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token') }),
  SignedIn: ({ children }: any) => children,
  SignedOut: () => null,
}));

// Mock the loadGame function to track calls
const mockLoadGame = vi.fn();

vi.mock('../../context/PlayerContext', async () => {
  const actual = await vi.importActual('../../context/PlayerContext');
  return {
    ...actual,
    usePlayer: () => ({
      currentGame: null,
      playerId: 'test-player',
      playerName: 'Test Player',
      displayName: 'Test Player',
      isNewUser: false,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      getKnownPlayerNames: vi.fn().mockResolvedValue([]),
      getAvailableGameTypes: vi.fn().mockResolvedValue([]),
      createGame: vi.fn(),
      joinGame: vi.fn(),
      loadGame: mockLoadGame.mockResolvedValue(undefined),
      submitMove: vi.fn(),
      refreshGame: vi.fn(),
      listAvailableGames: vi.fn().mockResolvedValue([]),
      listMyGames: vi.fn().mockResolvedValue([]),
    }),
  };
});

vi.mock('../../context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: any) => children,
  useWebSocket: () => ({
    connected: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onGameUpdate: vi.fn(),
    onTurnNotification: vi.fn(),
  }),
}));

describe('PlayerView Deep Linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL
    window.location.hash = '';
  });

  it('should load game from URL parameter on page refresh', async () => {
    // Simulate a URL with gameId parameter
    const gameId = '99aad7b9-fc6d-489a-8568-7d2a6d46d255';
    window.location.hash = `#/player?gameId=${gameId}`;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WebSocketProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </WebSocketProvider>
    );

    render(<PlayerView />, { wrapper });

    // Wait for the effect to run and loadGame to be called
    await waitFor(() => {
      expect(mockLoadGame).toHaveBeenCalledWith(gameId);
    });
  });

  it('should handle URL with multiple parameters', async () => {
    const gameId = '99aad7b9-fc6d-489a-8568-7d2a6d46d255';
    window.location.hash = `#/player?gameId=${gameId}&other=param`;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WebSocketProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </WebSocketProvider>
    );

    render(<PlayerView />, { wrapper });

    await waitFor(() => {
      expect(mockLoadGame).toHaveBeenCalledWith(gameId);
    });
  });

  it('should not load game if no gameId parameter', async () => {
    window.location.hash = '#/player';

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WebSocketProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </WebSocketProvider>
    );

    render(<PlayerView />, { wrapper });

    // Wait a bit to ensure no calls are made
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockLoadGame).not.toHaveBeenCalled();
  });
});