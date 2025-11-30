import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { GameClient } from '../api/gameClient';
import type { GameState } from '../types/game';

/**
 * WebSocket message types from server
 */
interface WebSocketMessage {
  type: string;
  timestamp: string;
}

interface GameUpdateMessage extends WebSocketMessage {
  type: 'game_update';
  gameId: string;
  gameState: GameState;
}

interface TurnNotificationMessage extends WebSocketMessage {
  type: 'turn_notification';
  gameId: string;
  currentPlayer: string;
}

interface GameCompleteMessage extends WebSocketMessage {
  type: 'game_complete';
  gameId: string;
  winner: string | null;
}

interface SubscribedMessage extends WebSocketMessage {
  type: 'subscribed';
  gameId: string;
}

interface UnsubscribedMessage extends WebSocketMessage {
  type: 'unsubscribed';
  gameId: string;
}

interface PongMessage extends WebSocketMessage {
  type: 'pong';
}

interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

type ServerMessage =
  | GameUpdateMessage
  | TurnNotificationMessage
  | GameCompleteMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | PongMessage
  | ErrorMessage;

/**
 * WebSocket context state
 */
interface WebSocketContextState {
  connected: boolean;
}

/**
 * WebSocket context actions
 */
interface WebSocketContextActions {
  subscribe: (gameId: string) => void;
  unsubscribe: (gameId: string) => void;
  onGameUpdate: (callback: (gameState: GameState) => void) => void;
  onTurnNotification: (callback: (gameId: string) => void) => void;
}

/**
 * Combined context type
 */
type WebSocketContextType = WebSocketContextState & WebSocketContextActions;

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

/**
 * WebSocket context provider props
 */
interface WebSocketProviderProps {
  children: ReactNode;
}

/**
 * WebSocket context provider component
 * Manages WebSocket connection for real-time game updates
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { getToken, userId } = useAuth();
  const [connected, setConnected] = useState(false);

  // WebSocket instance
  const wsRef = useRef<WebSocket | null>(null);

  // Reconnection state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const initialBackoff = 1000; // 1 second
  const maxBackoff = 30000; // 30 seconds

  // Polling state (fallback when WebSocket fails)
  const pollingRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingInterval = 5000; // 5 seconds

  // Subscriptions
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const pendingSubscriptionsRef = useRef<Set<string>>(new Set());

  // Event callbacks
  const gameUpdateCallbacksRef = useRef<Array<(gameState: GameState) => void>>([]);
  const turnNotificationCallbacksRef = useRef<Array<(gameId: string) => void>>([]);

  // Game client for polling fallback
  const client = useMemo(() => new GameClient('/api', getToken), [getToken]);

  /**
   * Calculate exponential backoff delay
   */
  const getBackoffDelay = useCallback((attempt: number): number => {
    return Math.min(initialBackoff * Math.pow(2, attempt), maxBackoff);
  }, []);

  /**
   * Start polling for game updates (fallback mechanism)
   * Requirement: 14.5 - Fallback to polling
   */
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = true;

    const poll = async () => {
      if (!pollingRef.current) return;

      // Poll all subscribed games
      for (const gameId of subscriptionsRef.current) {
        try {
          const gameState = await client.getGame(gameId);

          // Emit game update to callbacks
          gameUpdateCallbacksRef.current.forEach((callback) => {
            callback(gameState);
          });
        } catch (error) {
          console.error(`Failed to poll game ${gameId}:`, error);
        }
      }
    };

    // Start polling interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  }, [client]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    pollingRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Send a message to the WebSocket server
   */
  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  /**
   * Subscribe to game updates
   * Requirement: 14.2 - Subscribe to game updates
   */
  const subscribe = useCallback(
    (gameId: string) => {
      subscriptionsRef.current.add(gameId);

      if (connected && wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'subscribe', gameId });
      } else {
        // Queue subscription for when connection is established
        pendingSubscriptionsRef.current.add(gameId);
      }
    },
    [connected, sendMessage]
  );

  /**
   * Unsubscribe from game updates
   * Requirement: 14.2 - Unsubscribe from game updates
   */
  const unsubscribe = useCallback(
    (gameId: string) => {
      subscriptionsRef.current.delete(gameId);
      pendingSubscriptionsRef.current.delete(gameId);

      if (connected && wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'unsubscribe', gameId });
      }
    },
    [connected, sendMessage]
  );

  /**
   * Register callback for game updates
   * Requirement: 14.3 - Event emission on game updates
   */
  const onGameUpdate = useCallback((callback: (gameState: GameState) => void) => {
    gameUpdateCallbacksRef.current.push(callback);
  }, []);

  /**
   * Register callback for turn notifications
   * Requirement: 14.3 - Event emission on turn notifications
   */
  const onTurnNotification = useCallback((callback: (gameId: string) => void) => {
    turnNotificationCallbacksRef.current.push(callback);
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'game_update':
          // Emit game update to all callbacks
          gameUpdateCallbacksRef.current.forEach((callback) => {
            callback(message.gameState);
          });
          break;

        case 'turn_notification':
          // Emit turn notification to all callbacks
          turnNotificationCallbacksRef.current.forEach((callback) => {
            callback(message.gameId);
          });
          break;

        case 'game_complete':
          // Emit game complete as a game update event
          gameUpdateCallbacksRef.current.forEach((callback) => {
            // Trigger callbacks to refetch game state
            // In a real implementation, we might want a separate callback
          });
          break;

        case 'subscribed':
          console.log(`Subscribed to game ${message.gameId}`);
          break;

        case 'unsubscribed':
          console.log(`Unsubscribed from game ${message.gameId}`);
          break;

        case 'pong':
          // Keepalive response
          break;

        case 'error':
          console.error('WebSocket error message:', message.message);
          break;

        default:
          console.warn('Unknown message type:', (message as any).type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, []);

  /**
   * Connect to WebSocket server
   * Requirement: 14.1 - WebSocket connection establishment
   */
  const connect = useCallback(async () => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Don't connect if no user ID
    if (!userId) {
      return;
    }

    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        console.warn('No authentication token available');
        return;
      }

      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws?token=${token}`;

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set handlers immediately before any async operations
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);

        // Reset reconnection attempts on successful connection
        reconnectAttemptsRef.current = 0;

        // Stop polling if it was active
        stopPolling();

        // Send pending subscriptions
        pendingSubscriptionsRef.current.forEach((gameId) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'subscribe', gameId }));
          }
        });
        pendingSubscriptionsRef.current.clear();
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setConnected(false);
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        // Requirement: 14.4 - Reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = getBackoffDelay(reconnectAttemptsRef.current);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          // Max reconnection attempts reached, fall back to polling
          console.warn('Max reconnection attempts reached, falling back to polling');
          startPolling();
        }
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnected(false);

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = getBackoffDelay(reconnectAttemptsRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        startPolling();
      }
    }
  }, [userId, getToken, handleMessage, sendMessage, getBackoffDelay, startPolling, stopPolling]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Stop polling
    stopPolling();

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
  }, [stopPolling]);

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - connect and disconnect are stable

  const value: WebSocketContextType = {
    connected,
    subscribe,
    unsubscribe,
    onGameUpdate,
    onTurnNotification,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

/**
 * Hook to access WebSocket context
 * Must be used within WebSocketProvider
 */
export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
