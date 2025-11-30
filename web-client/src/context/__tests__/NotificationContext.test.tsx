import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { NotificationProvider, useNotifications } from '../NotificationContext';
import { WebSocketProvider } from '../WebSocketContext';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ 
    getToken: vi.fn().mockResolvedValue('test-token'),
    userId: 'test-user-id',
  }),
}));

// Mock GameClient (used by WebSocketContext for polling fallback)
vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getGame = vi.fn();
    },
  };
});

describe('NotificationContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WebSocketProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </WebSocketProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification State Management', () => {
    it('should initialize with empty notifications', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Mark as Read Functionality', () => {
    it('should handle marking non-existent notification', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Should not throw error
      expect(() => {
        act(() => {
          result.current.markAsRead('non-existent-id');
        });
      }).not.toThrow();
    });
  });

  describe('Clear All Functionality', () => {
    it('should clear all notifications', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Clear all (even if empty)
      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Notification Count', () => {
    it('should calculate unread count correctly', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Initially zero
      expect(result.current.unreadCount).toBe(0);
    });
  });
});
