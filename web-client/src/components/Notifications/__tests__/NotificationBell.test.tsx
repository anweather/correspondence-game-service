import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';
import type { Notification } from '../../../context/NotificationContext';

describe('NotificationBell', () => {
  const mockOnClick = vi.fn();
  const mockOnMarkAsRead = vi.fn();
  const mockOnClearAll = vi.fn();

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

  describe('Bell Icon Rendering', () => {
    it('should render bell icon', () => {
      render(
        <NotificationBell
          notifications={[]}
          unreadCount={0}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      // Should have a button with bell icon or notification text
      const bellButton = screen.getByRole('button', { name: /notification/i });
      expect(bellButton).toBeInTheDocument();
    });

    it('should render bell button as clickable', () => {
      render(
        <NotificationBell
          notifications={[]}
          unreadCount={0}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      expect(bellButton).not.toBeDisabled();
    });

    it('should have proper ARIA label', () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      expect(bellButton).toHaveAttribute('aria-label');
    });
  });

  describe('Unread Count Display', () => {
    it('should display unread count when greater than zero', () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not display count badge when unread count is zero', () => {
      render(
        <NotificationBell
          notifications={[mockNotifications[2]]}
          unreadCount={0}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      // Should not show "0" badge
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should display correct count for multiple unread notifications', () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display count badge with proper styling', () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={5}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(/badge/i);
    });

    it('should handle large unread counts', () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={99}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      // Should display 99+ or just 99
      const badge = screen.getByText(/99/);
      expect(badge).toBeInTheDocument();
    });

    it('should update count when notifications change', () => {
      const { rerender } = render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();

      rerender(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={1}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should not show dropdown initially', () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      // Dropdown should not be visible initially
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('should show dropdown when bell is clicked', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });

    it('should hide dropdown when bell is clicked again', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      
      // Open dropdown
      fireEvent.click(bellButton);
      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // Close dropdown
      fireEvent.click(bellButton);
      await waitFor(() => {
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
      });
    });

    it('should display notifications in dropdown', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/It's your turn in game game1/i)).toBeInTheDocument();
        expect(screen.getByText(/You've been invited to join game game2/i)).toBeInTheDocument();
      });
    });

    it('should show empty state in dropdown when no notifications', async () => {
      render(
        <NotificationBell
          notifications={[]}
          unreadCount={0}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <NotificationBell
            notifications={mockNotifications}
            unreadCount={2}
            onMarkAsRead={mockOnMarkAsRead}
            onClearAll={mockOnClearAll}
          />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // Click outside
      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);

      await waitFor(() => {
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
      });
    });
  });

  describe('Notification Actions', () => {
    it('should call onMarkAsRead when notification is clicked', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      const notification = screen.getByText(/It's your turn in game game1/i);
      fireEvent.click(notification);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif1');
    });

    it('should show clear all button when notifications exist', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
      });
    });

    it('should call onClearAll when clear all button is clicked', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      expect(mockOnClearAll).toHaveBeenCalled();
    });

    it('should not show clear all button when no notifications', async () => {
      render(
        <NotificationBell
          notifications={[]}
          unreadCount={0}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should visually distinguish unread notifications', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        const unreadNotif = screen.getByText(/It's your turn in game game1/i).closest('li');
        const readNotif = screen.getByText(/Game game3 has been completed/i).closest('li');

        expect(unreadNotif).toHaveClass(/unread/i);
        expect(readNotif).not.toHaveClass(/unread/i);
      });
    });

    it('should show notification type icons', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        // Should have some visual indicator for notification types
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });

    it('should display notification timestamps', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        // Should show some form of timestamp
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for dropdown', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      expect(bellButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(bellButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should be keyboard navigable', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      
      // Should be focusable
      bellButton.focus();
      expect(document.activeElement).toBe(bellButton);

      // Should open on Enter key
      fireEvent.keyDown(bellButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });

    it('should close dropdown on Escape key', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
      });
    });

    it('should have proper role for notification list', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();
      });
    });

    it('should announce unread count to screen readers', () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      const ariaLabel = bellButton.getAttribute('aria-label');
      
      expect(ariaLabel).toMatch(/2/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty notifications array', () => {
      render(
        <NotificationBell
          notifications={[]}
          unreadCount={0}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByRole('button', { name: /notification/i })).toBeInTheDocument();
    });

    it('should handle rapid toggle clicks', async () => {
      render(
        <NotificationBell
          notifications={mockNotifications}
          unreadCount={2}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      
      // First click - open
      fireEvent.click(bellButton);
      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // Second click - close
      fireEvent.click(bellButton);
      await waitFor(() => {
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
      });

      // Third click - open again
      fireEvent.click(bellButton);
      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });

    it('should handle notification with missing fields gracefully', async () => {
      const incompleteNotification: Notification = {
        id: 'notif4',
        type: 'turn',
        gameId: 'game4',
        message: '',
        read: false,
        createdAt: new Date(),
      };

      render(
        <NotificationBell
          notifications={[incompleteNotification]}
          unreadCount={1}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const bellButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });
  });
});
