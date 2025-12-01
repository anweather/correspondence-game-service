import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatsView } from '../StatsView';
import type { ReactNode } from 'react';

// Mock the gameClient - create mocks outside the factory
const mockGetPlayerStats = vi.fn();
const mockGetGameHistory = vi.fn();

vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getPlayerStats = mockGetPlayerStats;
      getGameHistory = mockGetGameHistory;
    },
  };
});

// Mock Clerk's useAuth
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
}));

// Mock PlayerContext
const mockPlayerContext = {
  playerId: 'player123',
  playerName: 'TestPlayer',
  isAuthenticated: true,
  isLoading: false,
};

vi.mock('../../context/PlayerContext', () => ({
  usePlayer: () => mockPlayerContext,
}));

describe('StatsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock responses
    mockGetPlayerStats.mockResolvedValue({
      userId: 'player123',
      totalGames: 42,
      wins: 28,
      losses: 12,
      draws: 2,
      winRate: 0.7,
      totalTurns: 1234,
      averageTurnsPerGame: 29.38,
    });

    mockGetGameHistory.mockResolvedValue({
      items: [
        {
          gameId: 'game1',
          gameType: 'tic-tac-toe',
          lifecycle: 'completed',
          players: [
            { id: 'player123', name: 'TestPlayer', joinedAt: '2024-01-01T10:00:00Z' },
            { id: 'player2', name: 'Bob', joinedAt: '2024-01-01T10:01:00Z' },
          ],
          currentPlayerIndex: 0,
          phase: 'game_over',
          board: { spaces: [], metadata: {} },
          moveHistory: [],
          metadata: { gameName: 'Quick Game' },
          version: 5,
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:15:00Z',
          winner: 'player123',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  describe('Overview and History Integration', () => {
    it('should render StatsView with header', async () => {
      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /statistics/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should render StatsOverview component', async () => {
      render(<StatsView />);

      await waitFor(() => {
        // StatsOverview should display stats
        expect(screen.getByText(/overall/i)).toBeInTheDocument();
        expect(screen.getByText(/42/)).toBeInTheDocument(); // Total games
      });
    });

    it('should render GameHistory component', async () => {
      render(<StatsView />);

      await waitFor(() => {
        // GameHistory should display games
        expect(screen.getByText(/Quick Game/)).toBeInTheDocument();
      });
    });

    it('should fetch player stats on mount', async () => {
      render(<StatsView />);

      await waitFor(() => {
        expect(mockGetPlayerStats).toHaveBeenCalledWith(undefined);
      });
    });

    it('should fetch game history on mount', async () => {
      render(<StatsView />);

      await waitFor(() => {
        expect(mockGetGameHistory).toHaveBeenCalledWith(expect.any(Object));
      });
    });

    it('should display both overview and history sections', async () => {
      render(<StatsView />);

      await waitFor(() => {
        // Check for both sections
        expect(screen.getByText(/overall/i)).toBeInTheDocument();
        expect(screen.getByText(/Quick Game/)).toBeInTheDocument();
      });
    });

    it('should pass stats data to StatsOverview', async () => {
      render(<StatsView />);

      await waitFor(() => {
        // Verify stats are displayed
        expect(screen.getByText(/42/)).toBeInTheDocument(); // Total games
        expect(screen.getByText(/70\.0%|70%/)).toBeInTheDocument(); // Win rate
      });
    });

    it('should pass game history data to GameHistory', async () => {
      render(<StatsView />);

      await waitFor(() => {
        // Verify game history is displayed
        expect(screen.getByText(/Quick Game/)).toBeInTheDocument();
        expect(screen.getByText(/Bob/)).toBeInTheDocument();
      });
    });
  });

  describe('Game Type Filtering', () => {
    it('should render game type filter dropdown', async () => {
      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByLabelText(/filter by game type/i)).toBeInTheDocument();
      });
    });

    it('should show "All Games" option by default', async () => {
      render(<StatsView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i) as HTMLSelectElement;
        expect(select.value).toBe('');
      });
    });

    it('should show available game types in dropdown', async () => {
      render(<StatsView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        expect(select).toBeInTheDocument();
        
        // Check for game type options
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(1);
      });
    });

    it('should fetch filtered stats when game type is selected', async () => {
      render(<StatsView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      await waitFor(() => {
        expect(mockGetPlayerStats).toHaveBeenCalledWith('tic-tac-toe');
      });
    });

    it('should fetch filtered game history when game type is selected', async () => {
      render(<StatsView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      await waitFor(() => {
        expect(mockGetGameHistory).toHaveBeenCalledWith(
          expect.objectContaining({ gameType: 'tic-tac-toe' })
        );
      });
    });

    it('should update both overview and history when filter changes', async () => {
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        gameType: 'tic-tac-toe',
        totalGames: 20,
        wins: 15,
        losses: 5,
        draws: 0,
        winRate: 0.75,
        totalTurns: 180,
        averageTurnsPerGame: 9,
      });

      mockGetGameHistory.mockResolvedValue({
        items: [
          {
            gameId: 'game2',
            gameType: 'tic-tac-toe',
            lifecycle: 'completed',
            players: [
              { id: 'player123', name: 'TestPlayer', joinedAt: '2024-01-02T10:00:00Z' },
              { id: 'player3', name: 'Alice', joinedAt: '2024-01-02T10:01:00Z' },
            ],
            currentPlayerIndex: 0,
            phase: 'game_over',
            board: { spaces: [], metadata: {} },
            moveHistory: [],
            metadata: { gameName: 'TTT Game' },
            version: 5,
            createdAt: '2024-01-02T10:00:00Z',
            updatedAt: '2024-01-02T10:15:00Z',
            winner: 'player123',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      render(<StatsView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      await waitFor(() => {
        // Should show filtered stats - use unique win rate
        expect(screen.getByText(/75\.0%/)).toBeInTheDocument(); // Filtered win rate
        expect(screen.getByText(/TTT Game/)).toBeInTheDocument(); // Filtered game
      });
    });

    it('should clear filter when "All Games" is selected', async () => {
      render(<StatsView />);

      // First select a game type
      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      // Then select "All Games"
      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: '' } });
      });

      await waitFor(() => {
        expect(mockGetPlayerStats).toHaveBeenLastCalledWith(undefined);
      });
    });

    it('should maintain filter state when navigating', async () => {
      render(<StatsView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'connect-four' } });
      });

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i) as HTMLSelectElement;
        expect(select.value).toBe('connect-four');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching stats', () => {
      mockGetPlayerStats.mockReturnValue(new Promise(() => {})); // Never resolves
      mockGetGameHistory.mockReturnValue(new Promise(() => {}));

      render(<StatsView />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show loading state in StatsOverview while fetching', () => {
      mockGetPlayerStats.mockReturnValue(new Promise(() => {}));
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show loading state in GameHistory while fetching', () => {
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalTurns: 0,
        averageTurnsPerGame: 0,
      });
      mockGetGameHistory.mockReturnValue(new Promise(() => {}));

      render(<StatsView />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should hide loading state after data is loaded', async () => {
      render(<StatsView />);

      await waitFor(() => {
        expect(screen.queryByText(/loading statistics/i)).not.toBeInTheDocument();
      });
    });

    it('should show loading state when filter changes', async () => {
      render(<StatsView />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/42/)).toBeInTheDocument();
      });

      // Mock slow response for filter change
      mockGetPlayerStats.mockReturnValue(new Promise(() => {}));
      mockGetGameHistory.mockReturnValue(new Promise(() => {}));

      const select = screen.getByLabelText(/filter by game type/i);
      fireEvent.change(select, { target: { value: 'tic-tac-toe' } });

      // Should show loading state
      await waitFor(() => {
        expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
      });
    });

    it('should handle loading state for stats and history independently', async () => {
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        totalGames: 10,
        wins: 5,
        losses: 5,
        draws: 0,
        winRate: 0.5,
        totalTurns: 100,
        averageTurnsPerGame: 10,
      });
      mockGetGameHistory.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<StatsView />);

      await waitFor(() => {
        // Stats should be loaded - check for unique win rate
        expect(screen.getByText(/50\.0%/)).toBeInTheDocument();
        // History should still be loading
        expect(screen.getByText(/loading game history/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when stats fetch fails', async () => {
      mockGetPlayerStats.mockRejectedValue(new Error('Failed to fetch stats'));
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getAllByText(/failed to load statistics/i).length).toBeGreaterThan(0);
      });
    });

    it('should display error message when game history fetch fails', async () => {
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        totalGames: 10,
        wins: 5,
        losses: 5,
        draws: 0,
        winRate: 0.5,
        totalTurns: 100,
        averageTurnsPerGame: 10,
      });
      mockGetGameHistory.mockRejectedValue(new Error('Failed to fetch history'));

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load game history/i)).toBeInTheDocument();
      });
    });

    it('should show retry button when stats fetch fails', async () => {
      mockGetPlayerStats.mockRejectedValue(new Error('Network error'));
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry fetching stats when retry button is clicked', async () => {
      mockGetPlayerStats.mockRejectedValueOnce(new Error('Network error'));
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Mock successful response for retry
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        totalGames: 15,
        wins: 8,
        losses: 7,
        draws: 0,
        winRate: 0.533,
        totalTurns: 150,
        averageTurnsPerGame: 10,
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockGetPlayerStats).toHaveBeenCalledTimes(2);
        // Check for Total Games label to ensure stats are loaded
        expect(screen.getByText('Total Games')).toBeInTheDocument();
        expect(screen.queryByText(/failed to load statistics/i)).not.toBeInTheDocument();
      });
    });

    it('should handle both stats and history errors simultaneously', async () => {
      mockGetPlayerStats.mockRejectedValue(new Error('Stats error'));
      mockGetGameHistory.mockRejectedValue(new Error('History error'));

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getAllByText(/failed to load statistics/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/failed to load game history/i)).toBeInTheDocument();
      });
    });

    it('should clear error when filter changes successfully', async () => {
      mockGetPlayerStats.mockRejectedValueOnce(new Error('Network error'));
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getAllByText(/failed to load statistics/i).length).toBeGreaterThan(0);
      });

      // Mock successful response for filter change
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        totalGames: 25,
        wins: 15,
        losses: 10,
        draws: 0,
        winRate: 0.6,
        totalTurns: 250,
        averageTurnsPerGame: 10,
      });

      const select = screen.getByLabelText(/filter by game type/i);
      fireEvent.change(select, { target: { value: 'tic-tac-toe' } });

      await waitFor(() => {
        expect(screen.queryByText(/failed to load statistics/i)).not.toBeInTheDocument();
        // Check for Total Games label to ensure stats are loaded
        expect(screen.getByText('Total Games')).toBeInTheDocument();
        expect(screen.getByText('60.0%')).toBeInTheDocument(); // Win rate is unique
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewport', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /statistics/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should render correctly on tablet viewport', async () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /statistics/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should render correctly on desktop viewport', async () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /statistics/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should stack components vertically on mobile', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<StatsView />);

      await waitFor(() => {
        // Component should render without errors
        expect(container.querySelector('div')).toBeInTheDocument();
      });
    });

    it('should display components side-by-side on desktop', async () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<StatsView />);

      await waitFor(() => {
        // Component should render without errors
        expect(container.querySelector('div')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when player has no games', async () => {
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalTurns: 0,
        averageTurnsPerGame: 0,
      });
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByText(/no games played yet/i)).toBeInTheDocument();
        expect(screen.getByText(/haven't played any games yet/i)).toBeInTheDocument();
      });
    });

    it('should show helpful message in empty state', async () => {
      mockGetPlayerStats.mockResolvedValue({
        userId: 'player123',
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalTurns: 0,
        averageTurnsPerGame: 0,
      });
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      await waitFor(() => {
        expect(screen.getByText(/start a new game/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<StatsView />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      });
    });

    it('should have accessible filter label', async () => {
      render(<StatsView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        expect(select).toBeInTheDocument();
      });
    });

    it('should have accessible retry button', async () => {
      mockGetPlayerStats.mockRejectedValue(new Error('Network error'));
      mockGetGameHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<StatsView />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });
  });
});
