import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';

/**
 * Notification type
 */
export interface Notification {
  id: string;
  type: 'turn' | 'invitation' | 'game_complete';
  gameId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Notification context value
 */
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

/**
 * Notification provider props
 */
interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Notification context provider component
 * Manages in-app notifications and integrates with WebSocket
 * Requirements: 13.3, 13.4
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { onTurnNotification } = useWebSocket();

  /**
   * Calculate unread count
   */
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  /**
   * Generate notification ID
   */
  const generateId = useCallback((): string => {
    return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  /**
   * Create notification message based on type
   */
  const createMessage = useCallback(
    (type: Notification['type'], gameId: string): string => {
      switch (type) {
        case 'turn':
          return `It's your turn in game ${gameId}`;
        case 'invitation':
          return `You've been invited to join game ${gameId}`;
        case 'game_complete':
          return `Game ${gameId} has been completed`;
        default:
          return `Notification for game ${gameId}`;
      }
    },
    []
  );

  /**
   * Add a new notification
   */
  const addNotification = useCallback(
    (
      type: Notification['type'],
      gameId: string
    ): void => {
      // Check if notification for this game already exists
      setNotifications((prev) => {
        const existingIndex = prev.findIndex(
          (n) => n.gameId === gameId && n.type === type
        );

        const newNotification: Notification = {
          id: generateId(),
          type,
          gameId,
          message: createMessage(type, gameId),
          read: false,
          createdAt: new Date(),
        };

        // If notification exists, replace it (update)
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newNotification;
          return updated;
        }

        // Otherwise, add new notification
        return [...prev, newNotification];
      });
    },
    [generateId, createMessage]
  );

  /**
   * Mark notification as read
   * Requirement: 13.3 - Mark as read functionality
   */
  const markAsRead = useCallback((notificationId: string): void => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  /**
   * Clear all notifications
   * Requirement: 13.4 - Clear all functionality
   */
  const clearAll = useCallback((): void => {
    setNotifications([]);
  }, []);

  /**
   * Handle turn notifications from WebSocket
   * Requirement: 13.3 - WebSocket integration
   */
  useEffect(() => {
    const handleTurnNotification = (gameId: string) => {
      addNotification('turn', gameId);
    };

    onTurnNotification(handleTurnNotification);
  }, [onTurnNotification, addNotification]);



  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 * Must be used within NotificationProvider
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
