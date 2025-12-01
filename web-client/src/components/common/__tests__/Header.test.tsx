import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Header } from '../Header';
import type { ReactNode } from 'react';

// Mock Clerk authentication
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue(null) }),
}));

// Mock PlayerContext
vi.mock('../../../context/PlayerContext', () => ({
  usePlayer: () => ({
    displayName: 'TestPlayer',
    playerId: 'player-123',
  }),
}));

// Mock NotificationContext
vi.mock('../../../context/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 3,
    notifications: [],
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navigation Links', () => {
    it('should render all navigation links', () => {
      render(<Header currentView="home" />);

      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /lobby/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my games/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /stats/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /leaderboard/i })).toBeInTheDocument();
    });

    it('should render profile link', () => {
      render(<Header currentView="home" />);

      // Profile link shows display name, not "Profile"
      expect(screen.getByRole('link', { name: 'TestPlayer' })).toBeInTheDocument();
    });

    it('should have correct href attributes for navigation links', () => {
      render(<Header currentView="home" />);

      expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /lobby/i })).toHaveAttribute('href', '/lobby');
      expect(screen.getByRole('link', { name: /my games/i })).toHaveAttribute('href', '/games');
      expect(screen.getByRole('link', { name: /stats/i })).toHaveAttribute('href', '/stats');
      expect(screen.getByRole('link', { name: /leaderboard/i })).toHaveAttribute('href', '/leaderboard');
      expect(screen.getByRole('link', { name: 'TestPlayer' })).toHaveAttribute('href', '/profile');
    });
  });

  describe('Active View Highlighting', () => {
    it('should highlight home link when on home view', () => {
      render(<Header currentView="home" />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink.className).toContain('active');
    });

    it('should highlight lobby link when on lobby view', () => {
      render(<Header currentView="lobby" />);

      const lobbyLink = screen.getByRole('link', { name: /lobby/i });
      expect(lobbyLink.className).toContain('active');
    });

    it('should highlight games link when on games view', () => {
      render(<Header currentView="games" />);

      const gamesLink = screen.getByRole('link', { name: /my games/i });
      expect(gamesLink.className).toContain('active');
    });

    it('should highlight stats link when on stats view', () => {
      render(<Header currentView="stats" />);

      const statsLink = screen.getByRole('link', { name: /stats/i });
      expect(statsLink.className).toContain('active');
    });

    it('should highlight leaderboard link when on leaderboard view', () => {
      render(<Header currentView="leaderboard" />);

      const leaderboardLink = screen.getByRole('link', { name: /leaderboard/i });
      expect(leaderboardLink.className).toContain('active');
    });

    it('should highlight profile link when on profile view', () => {
      render(<Header currentView="profile" />);

      const profileLink = screen.getByRole('link', { name: 'TestPlayer' });
      expect(profileLink.className).toContain('active');
    });

    it('should only highlight one link at a time', () => {
      render(<Header currentView="lobby" />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      const lobbyLink = screen.getByRole('link', { name: /lobby/i });

      expect(homeLink.className).not.toContain('active');
      expect(lobbyLink.className).toContain('active');
    });
  });

  describe('Display Name', () => {
    it('should display player display name', () => {
      render(<Header currentView="home" />);

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    it('should display display name in profile section', () => {
      render(<Header currentView="home" />);

      const profileSection = screen.getByText('TestPlayer').closest('div');
      expect(profileSection).toBeInTheDocument();
    });
  });

  describe('Notification Bell', () => {
    it('should display notification bell', () => {
      render(<Header currentView="home" />);

      // Look for notification bell button or icon
      const notificationBell = screen.getByRole('button', { name: /notifications/i });
      expect(notificationBell).toBeInTheDocument();
    });

    it('should display unread notification count', () => {
      render(<Header currentView="home" />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display notification count badge', () => {
      render(<Header currentView="home" />);

      const badge = screen.getByText('3');
      expect(badge.className).toContain('badge');
    });

    it('should not display badge when count is zero', () => {
      // Override the mock for this test
      vi.mocked(vi.importActual('../../../context/NotificationContext')).useNotifications = () => ({
        unreadCount: 0,
        notifications: [],
        markAsRead: vi.fn(),
        clearAll: vi.fn(),
      });

      render(<Header currentView="home" />);

      const badge = screen.queryByText('0');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render header with responsive class', () => {
      const { container } = render(<Header currentView="home" />);

      const header = container.querySelector('header');
      // CSS modules hash the class names, so just check it has a class
      expect(header?.className).toBeTruthy();
    });

    it('should have navigation container', () => {
      const { container } = render(<Header currentView="home" />);

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should have profile section container', () => {
      render(<Header currentView="home" />);

      // Profile section should contain display name
      const displayName = screen.getByText('TestPlayer');
      expect(displayName).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have navigation landmark', () => {
      render(<Header currentView="home" />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have banner landmark', () => {
      render(<Header currentView="home" />);

      const banner = screen.getByRole('banner');
      expect(banner).toBeInTheDocument();
    });

    it('should have accessible notification button', () => {
      render(<Header currentView="home" />);

      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      expect(notificationButton).toHaveAttribute('aria-label');
    });

    it('should indicate current page in navigation', () => {
      render(<Header currentView="lobby" />);

      const lobbyLink = screen.getByRole('link', { name: /lobby/i });
      expect(lobbyLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Layout Structure', () => {
    it('should render header as top-level element', () => {
      const { container } = render(<Header currentView="home" />);

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should contain navigation and profile sections', () => {
      render(<Header currentView="home" />);

      const nav = screen.getByRole('navigation');
      const displayName = screen.getByText('TestPlayer');

      expect(nav).toBeInTheDocument();
      expect(displayName).toBeInTheDocument();
    });
  });
});
