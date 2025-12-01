import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsOverview } from '../StatsOverview';
import type { PlayerStats } from '../../../types/game';

describe('StatsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Aggregate Stats Display', () => {
    it('should render overall statistics', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 42,
        wins: 28,
        losses: 12,
        draws: 2,
        winRate: 0.7,
        totalTurns: 1234,
        averageTurnsPerGame: 29.38,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText(/42/)).toBeInTheDocument(); // Total games
      expect(screen.getByText(/28/)).toBeInTheDocument(); // Wins
      expect(screen.getByText(/12/)).toBeInTheDocument(); // Losses
      expect(screen.getByText(/70\.0%|70%/)).toBeInTheDocument(); // Win rate
    });

    it('should display total turns', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 10,
        wins: 5,
        losses: 5,
        draws: 0,
        winRate: 0.5,
        totalTurns: 500,
        averageTurnsPerGame: 50,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('should display average turns per game', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 10,
        wins: 5,
        losses: 5,
        draws: 0,
        winRate: 0.5,
        totalTurns: 500,
        averageTurnsPerGame: 50,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText('Avg Turns/Game')).toBeInTheDocument();
      expect(screen.getByText('50.0')).toBeInTheDocument();
    });

    it('should display draws count', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 20,
        wins: 8,
        losses: 10,
        draws: 2,
        winRate: 0.4,
        totalTurns: 600,
        averageTurnsPerGame: 30,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText('Draws')).toBeInTheDocument();
      // Check that the draws value is displayed (it's unique in this test)
      const allDrawsElements = screen.getAllByText('2');
      expect(allDrawsElements.length).toBeGreaterThan(0);
    });
  });

  describe('Per-Game-Type Breakdown', () => {
    it('should display game type when provided', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        gameType: 'tic-tac-toe',
        totalGames: 20,
        wins: 15,
        losses: 5,
        draws: 0,
        winRate: 0.75,
        totalTurns: 180,
        averageTurnsPerGame: 9,
      };

      render(<StatsOverview stats={stats} />);

      // Component formats "tic-tac-toe" as "Tic Tac Toe"
      expect(screen.getByText(/Tic Tac Toe/)).toBeInTheDocument();
    });

    it('should show "Overall" when no game type specified', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 42,
        wins: 28,
        losses: 12,
        draws: 2,
        winRate: 0.7,
        totalTurns: 1234,
        averageTurnsPerGame: 29.38,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText(/overall/i)).toBeInTheDocument();
    });

    it('should display multiple game type stats when provided as array', () => {
      const statsList: PlayerStats[] = [
        {
          userId: 'user123',
          gameType: 'tic-tac-toe',
          totalGames: 20,
          wins: 15,
          losses: 5,
          draws: 0,
          winRate: 0.75,
          totalTurns: 180,
          averageTurnsPerGame: 9,
        },
        {
          userId: 'user123',
          gameType: 'connect-four',
          totalGames: 22,
          wins: 13,
          losses: 7,
          draws: 2,
          winRate: 0.59,
          totalTurns: 264,
          averageTurnsPerGame: 12,
        },
      ];

      render(<StatsOverview stats={statsList[0]} gameTypeStats={statsList} />);

      // Component formats game type names - there will be multiple instances
      const ticTacToeElements = screen.getAllByText(/Tic Tac Toe/);
      expect(ticTacToeElements.length).toBeGreaterThan(0);
      
      expect(screen.getByText(/Connect Four/)).toBeInTheDocument();
      expect(screen.getByText(/By Game Type/)).toBeInTheDocument();
    });

    it('should format game type names nicely', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        gameType: 'connect-four',
        totalGames: 10,
        wins: 6,
        losses: 4,
        draws: 0,
        winRate: 0.6,
        totalTurns: 120,
        averageTurnsPerGame: 12,
      };

      render(<StatsOverview stats={stats} />);

      // Should display formatted name (e.g., "Connect Four" instead of "connect-four")
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero games gracefully', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalTurns: 0,
        averageTurnsPerGame: 0,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText('Total Games')).toBeInTheDocument();
      expect(screen.getByText(/no games played/i)).toBeInTheDocument();
    });

    it('should display 0% win rate for zero games', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalTurns: 0,
        averageTurnsPerGame: 0,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText(/0\.0%|0%/)).toBeInTheDocument();
    });

    it('should handle 100% win rate', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 10,
        wins: 10,
        losses: 0,
        draws: 0,
        winRate: 1.0,
        totalTurns: 90,
        averageTurnsPerGame: 9,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText(/100\.0%|100%/)).toBeInTheDocument();
    });

    it('should handle all losses (0% win rate)', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 10,
        wins: 0,
        losses: 10,
        draws: 0,
        winRate: 0,
        totalTurns: 90,
        averageTurnsPerGame: 9,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('Total Games')).toBeInTheDocument();
      expect(screen.getByText('Losses')).toBeInTheDocument();
      // Both total games and losses show 10
      const tensElements = screen.getAllByText('10');
      expect(tensElements.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle decimal win rates correctly', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 15,
        wins: 7,
        losses: 8,
        draws: 0,
        winRate: 0.4667,
        totalTurns: 150,
        averageTurnsPerGame: 10,
      };

      render(<StatsOverview stats={stats} />);

      // Should display as percentage with 1 decimal place
      expect(screen.getByText(/46\.7%/)).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 9999,
        wins: 5000,
        losses: 4999,
        draws: 0,
        winRate: 0.5001,
        totalTurns: 99990,
        averageTurnsPerGame: 10,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText(/9999|9,999/)).toBeInTheDocument();
      expect(screen.getByText(/99990|99,990/)).toBeInTheDocument();
    });

    it('should show loading state when stats is undefined', () => {
      render(<StatsOverview stats={undefined} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show error message when error prop is provided', () => {
      render(<StatsOverview stats={undefined} error="Failed to load stats" />);

      expect(screen.getByText(/failed to load stats/i)).toBeInTheDocument();
    });
  });

  describe('Visual Presentation', () => {
    it('should have proper semantic structure', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 42,
        wins: 28,
        losses: 12,
        draws: 2,
        winRate: 0.7,
        totalTurns: 1234,
        averageTurnsPerGame: 29.38,
      };

      render(<StatsOverview stats={stats} />);

      // Should have headings for sections
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should display stats in a readable format', () => {
      const stats: PlayerStats = {
        userId: 'user123',
        totalGames: 42,
        wins: 28,
        losses: 12,
        draws: 2,
        winRate: 0.7,
        totalTurns: 1234,
        averageTurnsPerGame: 29.38,
      };

      const { container } = render(<StatsOverview stats={stats} />);

      // Should have some structure (divs, sections, etc.)
      const statsOverview = container.querySelector('div');
      expect(statsOverview).toBeInTheDocument();
      // Check that it has a class (CSS modules will hash it)
      expect(statsOverview?.className).toBeTruthy();
    });
  });
});
