import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardTable } from '../LeaderboardTable';
import type { LeaderboardEntry } from '../../../types/game';

describe('LeaderboardTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ranked List Rendering', () => {
    it('should render leaderboard entries with rankings', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
        {
          rank: 2,
          userId: 'user2',
          displayName: 'bob',
          totalGames: 45,
          wins: 35,
          losses: 10,
          winRate: 0.778,
        },
        {
          rank: 3,
          userId: 'user3',
          displayName: 'charlie',
          totalGames: 38,
          wins: 25,
          losses: 13,
          winRate: 0.658,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      // Check that all ranks are displayed
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      // Check that all display names are shown
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('charlie')).toBeInTheDocument();
    });

    it('should display all required columns', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      // Check for column headers
      expect(screen.getByText(/rank/i)).toBeInTheDocument();
      expect(screen.getByText(/player/i)).toBeInTheDocument();
      expect(screen.getByText(/games/i)).toBeInTheDocument();
      expect(screen.getByText(/wins/i)).toBeInTheDocument();
      expect(screen.getByText(/losses/i)).toBeInTheDocument();
      expect(screen.getByText(/win rate/i)).toBeInTheDocument();
    });

    it('should display game statistics for each player', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      expect(screen.getByText('50')).toBeInTheDocument(); // Total games
      expect(screen.getByText('42')).toBeInTheDocument(); // Wins
      expect(screen.getByText('8')).toBeInTheDocument(); // Losses
      expect(screen.getByText(/84\.0%|84%/)).toBeInTheDocument(); // Win rate
    });

    it('should format win rate as percentage', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 15,
          wins: 7,
          losses: 8,
          winRate: 0.4667,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      // Should display as percentage with 1 decimal place
      expect(screen.getByText(/46\.7%/)).toBeInTheDocument();
    });

    it('should render multiple entries in order', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
        {
          rank: 2,
          userId: 'user2',
          displayName: 'bob',
          totalGames: 45,
          wins: 35,
          losses: 10,
          winRate: 0.778,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} />);

      // Get all rows (excluding header)
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      // First row should contain alice
      expect(rows[0].textContent).toContain('alice');
      // Second row should contain bob
      expect(rows[1].textContent).toContain('bob');
    });
  });

  describe('Current Player Highlighting', () => {
    it('should highlight current player row', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
        {
          rank: 2,
          userId: 'currentUser',
          displayName: 'player42',
          totalGames: 42,
          wins: 28,
          losses: 12,
          winRate: 0.7,
        },
        {
          rank: 3,
          userId: 'user3',
          displayName: 'charlie',
          totalGames: 38,
          wins: 25,
          losses: 13,
          winRate: 0.658,
        },
      ];

      render(<LeaderboardTable entries={entries} currentUserId="currentUser" />);

      // Current player should be visible
      expect(screen.getByText('player42')).toBeInTheDocument();

      // Should have some visual indicator (check for "You" text or special styling)
      expect(screen.getByText(/you/i)).toBeInTheDocument();
    });

    it('should not highlight any row when currentUserId is not provided', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      // Should not show "You" indicator
      expect(screen.queryByText(/you/i)).not.toBeInTheDocument();
    });

    it('should not highlight when current user is not in leaderboard', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} currentUserId="notInList" />);

      // Should not show "You" indicator
      expect(screen.queryByText(/you/i)).not.toBeInTheDocument();
    });

    it('should show current player indicator next to their name', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'currentUser',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} currentUserId="currentUser" />);

      // Should show both name and indicator
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText(/you/i)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should display entries in rank order', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
        {
          rank: 2,
          userId: 'user2',
          displayName: 'bob',
          totalGames: 45,
          wins: 35,
          losses: 10,
          winRate: 0.778,
        },
        {
          rank: 3,
          userId: 'user3',
          displayName: 'charlie',
          totalGames: 38,
          wins: 25,
          losses: 13,
          winRate: 0.658,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} />);

      const rows = container.querySelectorAll('tbody tr');
      
      // Verify order by checking rank in each row
      expect(rows[0].textContent).toContain('1');
      expect(rows[1].textContent).toContain('2');
      expect(rows[2].textContent).toContain('3');
    });

    it('should maintain order even with non-sequential ranks', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
        {
          rank: 5,
          userId: 'user2',
          displayName: 'bob',
          totalGames: 45,
          wins: 35,
          losses: 10,
          winRate: 0.778,
        },
        {
          rank: 10,
          userId: 'user3',
          displayName: 'charlie',
          totalGames: 38,
          wins: 25,
          losses: 13,
          winRate: 0.658,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} />);

      const rows = container.querySelectorAll('tbody tr');
      
      // Should display in the order provided
      expect(rows[0].textContent).toContain('alice');
      expect(rows[1].textContent).toContain('bob');
      expect(rows[2].textContent).toContain('charlie');
    });

    it('should handle tied ranks', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
        {
          rank: 1,
          userId: 'user2',
          displayName: 'bob',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      // Both should show rank 1
      const rankOnes = screen.getAllByText('1');
      expect(rankOnes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no entries provided', () => {
      render(<LeaderboardTable entries={[]} />);

      expect(screen.getByText(/no players/i)).toBeInTheDocument();
    });

    it('should display empty state message', () => {
      render(<LeaderboardTable entries={[]} />);

      expect(screen.getByText(/no players on the leaderboard/i)).toBeInTheDocument();
    });

    it('should not display table headers when empty', () => {
      const { container } = render(<LeaderboardTable entries={[]} />);

      // Should not show table structure
      expect(container.querySelector('table')).not.toBeInTheDocument();
      expect(container.querySelector('thead')).not.toBeInTheDocument();
      expect(container.querySelector('tbody')).not.toBeInTheDocument();
    });

    it('should handle undefined entries gracefully', () => {
      render(<LeaderboardTable entries={undefined as any} />);

      expect(screen.getByText(/no players/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading state when loading prop is true', () => {
      render(<LeaderboardTable entries={[]} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should not display entries when loading', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} loading={true} />);

      // Should show loading, not entries
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(<LeaderboardTable entries={[]} error="Failed to load leaderboard" />);

      expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument();
    });

    it('should not display entries when error is present', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} error="Network error" />);

      // Should show error, not entries
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });
  });

  describe('Visual Presentation', () => {
    it('should render as a table element', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} />);

      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('should have proper table structure with thead and tbody', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} />);

      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('should apply CSS module classes', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} />);

      const table = container.querySelector('table');
      expect(table?.className).toBeTruthy();
    });

    it('should apply special styling to current player row', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'currentUser',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} currentUserId="currentUser" />);

      const row = container.querySelector('tbody tr');
      // Should have a special class for current user
      expect(row?.className).toContain('current');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 9999,
          wins: 5000,
          losses: 4999,
          winRate: 0.5001,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      expect(screen.getByText(/9999|9,999/)).toBeInTheDocument();
      expect(screen.getByText(/5000|5,000/)).toBeInTheDocument();
    });

    it('should handle 100% win rate', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 10,
          wins: 10,
          losses: 0,
          winRate: 1.0,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      expect(screen.getByText(/100\.0%|100%/)).toBeInTheDocument();
    });

    it('should handle 0% win rate', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 10,
          wins: 0,
          losses: 10,
          winRate: 0,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should handle long display names', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'very_long_display_name_that_might_break_layout',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      render(<LeaderboardTable entries={entries} />);

      expect(screen.getByText('very_long_display_name_that_might_break_layout')).toBeInTheDocument();
    });

    it('should handle single entry', () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
      ];

      const { container } = render(<LeaderboardTable entries={entries} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('should handle large leaderboard (50+ entries)', () => {
      const entries: LeaderboardEntry[] = Array.from({ length: 50 }, (_, i) => ({
        rank: i + 1,
        userId: `user${i + 1}`,
        displayName: `player${i + 1}`,
        totalGames: 50 - i,
        wins: 40 - i,
        losses: 10,
        winRate: (40 - i) / (50 - i),
      }));

      const { container } = render(<LeaderboardTable entries={entries} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(50);
    });
  });
});
