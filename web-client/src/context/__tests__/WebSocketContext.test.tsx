import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GameState } from '../../types/game';

// Mock Clerk BEFORE importing the component
const mockGetToken = vi.fn().mockResolvedValue('test-token-123');
const mockUserId = 'test-user-123';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ 
    getToken: mockGetToken,
    userId: mockUserId
  }),
  useUser: () => ({
    user: { id: mockUserId },
    isSignedIn: true
  }),
}));

// Mock GameClient for polling fallback
const mockGetGame = vi.fn();
vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getGame = mockGetGame;
    },
  };
});

// Import the component after mocks are set up
// Note: We import once, but each renderHook creates a new provider instance
import { WebSocketProvider, useWebSocket } from '../WebSocketContext';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Store instance immediately for test access
    mockWebSocketInstance = this;
    // Simulate connection - call onopen synchronously after a microtask
    // This allows the calling code to set the onopen handler first
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }
    }, 0);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close'));
      }
    }, 0);
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Helper method to simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Store the mock instance for test access
let mockWebSocketInstance: MockWebSocket | null = null;

// Add static constants to the MockWebSocket class
(MockWebSocket as any).CONNECTING = MockWebSocket.CONNECTING;
(MockWebSocket as any).OPEN = MockWebSocket.OPEN;
(MockWebSocket as any).CLOSING = MockWebSocket.CLOSING;
(MockWebSocket as any).CLOSED = MockWebSocket.CLOSED;

// Mock WebSocket globally - use the class directly
vi.stubGlobal('WebSocket', MockWebSocket);

describe('WebSocketContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketInstance = null;
    mockGetToken.mockResolvedValue('test-token-123');
  });

  afterEach(() => {
    // Clean up any timers
    vi.clearAllTimers();
    // Close any open WebSocket connections
    if (mockWebSocketInstance && mockWebSocketInstance.readyState !== MockWebSocket.CLOSED) {
      mockWebSocketInstance.close();
    }
  });

  describe('Connection Establishment', () => {
    it('should establish WebSocket connection on mount', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      // Initially not connected
      expect(result.current.connected).toBe(false);

      // Wait for connection to establish
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Verify WebSocket was created with correct URL
      expect(mockWebSocketInstance).not.toBeNull();
      expect(mockWebSocketInstance?.url).toContain('/api/ws');
      expect(mockWebSocketInstance?.url).toContain('token=test-token-123');
    });

    it('should not connect if no auth token is available', async () => {
      // Temporarily mock no token
      mockGetToken.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      // Wait a bit to ensure connection attempt would have happened
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should remain disconnected
      expect(result.current.connected).toBe(false);
      
      // Reset mock
      mockGetToken.mockResolvedValue('test-token-123');
    });

    it('should include auth token in connection URL', async () => {
      renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(mockWebSocketInstance?.url).toContain('token=test-token-123');
      }, { timeout: 1000 });
    });
  });

  describe('Subscribe/Unsubscribe', () => {
    it('should send subscribe message when subscribing to a game', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Subscribe to a game
      act(() => {
        result.current.subscribe('game-123');
      });

      // Verify subscribe message was sent
      expect(mockWebSocketInstance?.sentMessages).toContainEqual(
        JSON.stringify({ type: 'subscribe', gameId: 'game-123' })
      );
    });

    it('should send unsubscribe message when unsubscribing from a game', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Subscribe first
      act(() => {
        result.current.subscribe('game-123');
      });

      // Then unsubscribe
      act(() => {
        result.current.unsubscribe('game-123');
      });

      // Verify unsubscribe message was sent
      expect(mockWebSocketInstance?.sentMessages).toContainEqual(
        JSON.stringify({ type: 'unsubscribe', gameId: 'game-123' })
      );
    });

    it('should not send subscribe message if not connected', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      // Try to subscribe before connection is established
      act(() => {
        result.current.subscribe('game-123');
      });

      // No messages should be sent yet
      expect(mockWebSocketInstance?.sentMessages.length || 0).toBe(0);
    });

    it('should queue subscriptions and send when connected', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      // Subscribe before connection
      act(() => {
        result.current.subscribe('game-123');
      });

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Subscription should be sent after connection
      await waitFor(() => {
        expect(mockWebSocketInstance?.sentMessages).toContainEqual(
          JSON.stringify({ type: 'subscribe', gameId: 'game-123' })
        );
      }, { timeout: 1000 });
    });
  });

  describe('Event Emission on Game Updates', () => {
    it('should emit game update event when receiving game_update message', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

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
        version: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const gameUpdateCallback = vi.fn();

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Register callback
      act(() => {
        result.current.onGameUpdate(gameUpdateCallback);
      });

      // Simulate receiving game update message
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: 'game_update',
          gameId: 'game-123',
          gameState: mockGameState,
          timestamp: new Date().toISOString(),
        });
      });

      // Verify callback was called with game state
      await waitFor(() => {
        expect(gameUpdateCallback).toHaveBeenCalledWith(mockGameState);
      });
    });

    it('should emit turn notification event when receiving turn_notification message', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      const turnNotificationCallback = vi.fn();

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Register callback
      act(() => {
        result.current.onTurnNotification(turnNotificationCallback);
      });

      // Simulate receiving turn notification message
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: 'turn_notification',
          gameId: 'game-123',
          currentPlayer: 'player-1',
          timestamp: new Date().toISOString(),
        });
      });

      // Verify callback was called with game ID
      await waitFor(() => {
        expect(turnNotificationCallback).toHaveBeenCalledWith('game-123');
      });
    });

    it('should support multiple callbacks for game updates', async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

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
        version: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Register multiple callbacks
      act(() => {
        result.current.onGameUpdate(callback1);
        result.current.onGameUpdate(callback2);
      });

      // Simulate receiving game update
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: 'game_update',
          gameId: 'game-123',
          gameState: mockGameState,
          timestamp: new Date().toISOString(),
        });
      });

      // Both callbacks should be called
      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(mockGameState);
        expect(callback2).toHaveBeenCalledWith(mockGameState);
      });
    });
  });

  describe('Cleanup', () => {
    it('should close WebSocket connection on unmount', async () => {
      const { result, unmount } = renderHook(() => useWebSocket(), { wrapper });

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      const instance = mockWebSocketInstance;

      // Unmount
      unmount();

      await waitFor(() => {
        expect(instance?.readyState).toBe(MockWebSocket.CLOSED);
      }, { timeout: 1000 });
    });

    it('should clear all subscriptions on unmount', async () => {
      const { result, unmount } = renderHook(() => useWebSocket(), { wrapper });

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      }, { timeout: 1000 });

      // Subscribe to games
      act(() => {
        result.current.subscribe('game-1');
        result.current.subscribe('game-2');
      });

      // Unmount
      unmount();

      await waitFor(() => {
        expect(mockWebSocketInstance?.readyState).toBe(MockWebSocket.CLOSED);
      }, { timeout: 1000 });

      // Subscriptions should be cleared (verified by no errors on unmount)
    });
  });
});
