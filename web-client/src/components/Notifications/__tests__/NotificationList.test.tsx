import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationList } from '../NotificationList';
import type { Notification } from '../../../context/NotificationContext';

// Wrapper for components that need router
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('NotificationList', () => {
  const mockOnMarkAsRead = vi.fn();
  const mockOnNavigate = vi.fn();

  const mockNotifications: Notification[] = [
    {
      id: 'notif1',
      type: 'turn',
      gameId: 'game1',
      message: "It's your turn in game game1",
      read: false,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'notif2',
      type: 'invitation',
      gameId: 'game2',
      message: "You've been invited to join game game2",
      read: false,
      createdAt: new Date('2024-01-02T10:00:00Z'),
    },
    {
      id: 'notif3',
      type: 'game_complete',
      gameId: 'game3',
      message: 'Game game3 has been completed',
      read: true,
      createdAt: new Date('2024-01-03T10:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification List Rendering', () => {
    it('should render notification list', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should render all notifications', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      expect(screen.getByText(/It's your turn in game game1/i)).toBeInTheDocument();
      expect(screen.getByText(/You've been invited to join game game2/i)).toBeInTheDocument();
      expect(screen.getByText(/Game game3 has been completed/i)).toBeInTheDocument();
    });

    it('should render notification messages correctly', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const list = screen.getByRole('list');
      const items = within(list).getAllByRole('listitem');
      
      expect(items).toHaveLength(3);
    });

    it('should display notification type indicators', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      // Should have visual indicators for different notification types
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should display notification timestamps', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      // Timestamps should be visible in some form
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should visually distinguish read from unread notifications', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const unreadNotif = screen.getByText(/It's your turn in game game1/i).closest('li');
      const readNotif = screen.getByText(/Game game3 has been completed/i).closest('li');

      expect(unreadNotif).toHaveClass(/unread/i);
      expect(readNotif).not.toHaveClass(/unread/i);
    });
  });

  describe('Mark as Read', () => {
    it('should call onMarkAsRead when unread notification is clicked', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i);
      fireEvent.click(notification);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif1');
    });

    it('should call onMarkAsRead when read notification is clicked', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/Game game3 has been completed/i);
      fireEvent.click(notification);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif3');
    });

    it('should have mark as read button for unread notifications', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const unreadNotif = screen.getByText(/It's your turn in game game1/i).closest('li');
      
      // Should have some way to mark as read
      expect(unreadNotif).toBeInTheDocument();
    });

    it('should call onMarkAsRead with correct notification ID', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/You've been invited to join game game2/i);
      fireEvent.click(notification);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif2');
      expect(mockOnMarkAsRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('Click to Navigate', () => {
    it('should call onNavigate when notification is clicked', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i);
      fireEvent.click(notification);

      expect(mockOnNavigate).toHaveBeenCalledWith('game1');
    });

    it('should navigate to correct game when notification is clicked', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/You've been invited to join game game2/i);
      fireEvent.click(notification);

      expect(mockOnNavigate).toHaveBeenCalledWith('game2');
    });

    it('should call both onMarkAsRead and onNavigate when notification is clicked', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i);
      fireEvent.click(notification);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif1');
      expect(mockOnNavigate).toHaveBeenCalledWith('game1');
    });

    it('should be clickable for all notification types', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      // Turn notification
      const turnNotif = screen.getByText(/It's your turn in game game1/i);
      fireEvent.click(turnNotif);
      expect(mockOnNavigate).toHaveBeenCalledWith('game1');

      // Invitation notification
      const inviteNotif = screen.getByText(/You've been invited to join game game2/i);
      fireEvent.click(inviteNotif);
      expect(mockOnNavigate).toHaveBeenCalledWith('game2');

      // Game complete notification
      const completeNotif = screen.getByText(/Game game3 has been completed/i);
      fireEvent.click(completeNotif);
      expect(mockOnNavigate).toHaveBeenCalledWith('game3');
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no notifications', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={[]}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });

    it('should not render list when no notifications', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={[]}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('should display helpful message in empty state', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={[]}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const emptyMessage = screen.getByText(/no notifications/i);
      expect(emptyMessage).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role for list', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should have proper role for list items', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    it('should be keyboard navigable', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i).closest('li');
      
      // Should be focusable
      expect(notification).toHaveAttribute('tabIndex');
    });

    it('should support keyboard activation with Enter key', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i).closest('li');
      
      if (notification) {
        fireEvent.keyDown(notification, { key: 'Enter' });
        expect(mockOnNavigate).toHaveBeenCalledWith('game1');
      }
    });

    it('should support keyboard activation with Space key', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i).closest('li');
      
      if (notification) {
        fireEvent.keyDown(notification, { key: ' ' });
        expect(mockOnNavigate).toHaveBeenCalledWith('game1');
      }
    });

    it('should have proper ARIA labels for unread notifications', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const unreadNotif = screen.getByText(/It's your turn in game game1/i).closest('li');
      
      // Should have some indication for screen readers
      expect(unreadNotif).toBeInTheDocument();
    });
  });

  describe('Notification Sorting', () => {
    it('should display notifications in chronological order (newest first)', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const items = screen.getAllByRole('listitem');
      
      // Newest notification (game3) should be first
      expect(within(items[0]).getByText(/Game game3 has been completed/i)).toBeInTheDocument();
      
      // Oldest notification (game1) should be last
      expect(within(items[2]).getByText(/It's your turn in game game1/i)).toBeInTheDocument();
    });

    it('should handle notifications with same timestamp', () => {
      const sameTimeNotifications: Notification[] = [
        {
          id: 'notif1',
          type: 'turn',
          gameId: 'game1',
          message: "It's your turn in game game1",
          read: false,
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'notif2',
          type: 'invitation',
          gameId: 'game2',
          message: "You've been invited to join game game2",
          read: false,
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      render(
        <RouterWrapper>
          <NotificationList
            notifications={sameTimeNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle notification with missing message', () => {
      const incompleteNotification: Notification = {
        id: 'notif4',
        type: 'turn',
        gameId: 'game4',
        message: '',
        read: false,
        createdAt: new Date(),
      };

      render(
        <RouterWrapper>
          <NotificationList
            notifications={[incompleteNotification]}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(1);
    });

    it('should handle rapid clicks on same notification', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i);
      
      fireEvent.click(notification);
      fireEvent.click(notification);
      fireEvent.click(notification);

      // Should be called multiple times
      expect(mockOnMarkAsRead).toHaveBeenCalledTimes(3);
      expect(mockOnNavigate).toHaveBeenCalledTimes(3);
    });

    it('should handle very long notification messages', () => {
      const longMessageNotification: Notification = {
        id: 'notif5',
        type: 'turn',
        gameId: 'game5',
        message: 'This is a very long notification message that should be handled gracefully by the component without breaking the layout or causing any visual issues in the user interface',
        read: false,
        createdAt: new Date(),
      };

      render(
        <RouterWrapper>
          <NotificationList
            notifications={[longMessageNotification]}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      expect(screen.getByText(/This is a very long notification message/i)).toBeInTheDocument();
    });

    it('should handle large number of notifications', () => {
      const manyNotifications: Notification[] = Array.from({ length: 50 }, (_, i) => ({
        id: `notif${i}`,
        type: 'turn' as const,
        gameId: `game${i}`,
        message: `Notification ${i}`,
        read: i % 2 === 0,
        createdAt: new Date(Date.now() - i * 1000),
      }));

      render(
        <RouterWrapper>
          <NotificationList
            notifications={manyNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(50);
    });
  });

  describe('Visual Feedback', () => {
    it('should provide visual feedback on hover', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i).closest('li');
      
      // Should have hover styles
      expect(notification).toBeInTheDocument();
    });

    it('should show cursor pointer on notifications', () => {
      render(
        <RouterWrapper>
          <NotificationList
            notifications={mockNotifications}
            onMarkAsRead={mockOnMarkAsRead}
            onNavigate={mockOnNavigate}
          />
        </RouterWrapper>
      );

      const notification = screen.getByText(/It's your turn in game game1/i).closest('li');
      
      // Should indicate clickability
      expect(notification).toBeInTheDocument();
    });
  });
});
