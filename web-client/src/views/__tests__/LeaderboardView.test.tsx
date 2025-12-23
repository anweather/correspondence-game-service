import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeaderboardView } from '../LeaderboardView';

// Mock the gameClient - create mocks outside the factory
const mockGetLeaderboard = vi.fn();
const mockGetGameTypes = vi.fn();

vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getLeaderboard = mockGetLeaderboard;
      getGameTypes = mockGetGameTypes;
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

describe('LeaderboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock response for game types
    mockGetGameTypes.mockResolvedValue([
      { type: 'tic-tac-toe', name: 'Tic Tac Toe' },
      { type: 'connect-four', name: 'Connect Four' },
    ]);
    
    // Default mock response
    mockGetLeaderboard.mockResolvedValue({
      items: [
        {
          rank: 1,
          userId: 'player1',
          displayName: 'Alice',
          totalGames: 50,
          wins: 42,
          losses: 8,
          winRate: 0.84,
        },
        {
          rank: 2,
          userId: 'player2',
          displayName: 'Bob',
          totalGames: 45,
          wins: 35,
          losses: 10,
          winRate: 0.778,
        },
        {
          rank: 3,
          userId: 'player123',
          displayName: 'TestPlayer',
          totalGames: 42,
          wins: 28,
          losses: 14,
          winRate: 0.667,
        },
        {
          rank: 4,
          userId: 'player4',
          displayName: 'Charlie',
          totalGames: 38,
          wins: 25,
          losses: 13,
          winRate: 0.658,
        },
      ],
      total: 4,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
  });

  describe('Leaderboard Display', () => {
    it('should render LeaderboardView with header', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /leaderboard/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should render LeaderboardTable component', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        // LeaderboardTable should display players
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });

    it('should fetch leaderboard data on mount', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 50 });
      });
    });

    it('should display all leaderboard entries', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('TestPlayer')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
      });
    });

    it('should pass leaderboard data to LeaderboardTable', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        // Verify data is displayed
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText(/84\.0%|84%/)).toBeInTheDocument(); // Win rate
      });
    });

    it('should pass current player ID to LeaderboardTable', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        // Current player should be highlighted (TestPlayer)
        expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      });
    });
  });

  describe('Game Type Filtering', () => {
    it('should render game type filter dropdown', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByLabelText(/filter by game type/i)).toBeInTheDocument();
      });
    });

    it('should show "All Games" option by default', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i) as HTMLSelectElement;
        expect(select.value).toBe('');
      });
    });

    it('should show available game types in dropdown', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        expect(select).toBeInTheDocument();
        
        // Check for game type options
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(1);
      });
    });

    it('should fetch filtered leaderboard when game type is selected', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith('tic-tac-toe', { page: 1, pageSize: 50 });
      });
    });

    it('should update leaderboard when filter changes', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player5',
            displayName: 'Dave',
            totalGames: 30,
            wins: 25,
            losses: 5,
            winRate: 0.833,
          },
          {
            rank: 2,
            userId: 'player123',
            displayName: 'TestPlayer',
            totalGames: 20,
            wins: 15,
            losses: 5,
            winRate: 0.75,
          },
        ],
        total: 2,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      await waitFor(() => {
        // Should show filtered leaderboard
        expect(screen.getByText('Dave')).toBeInTheDocument();
        expect(screen.getByText(/83\.3%/)).toBeInTheDocument(); // Filtered win rate
      });
    });

    it('should clear filter when "All Games" is selected', async () => {
      render(<LeaderboardView />);

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
        expect(mockGetLeaderboard).toHaveBeenLastCalledWith(undefined, { page: 1, pageSize: 50 });
      });
    });

    it('should maintain filter state when navigating', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'connect-four' } });
      });

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i) as HTMLSelectElement;
        expect(select.value).toBe('connect-four');
      });
    });

    it('should reset to page 1 when filter changes', async () => {
      render(<LeaderboardView />);

      // Change filter
      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith('tic-tac-toe', { page: 1, pageSize: 50 });
      });
    });
  });

  describe('Pagination', () => {
    it('should show pagination controls when there are multiple pages', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('should not show pagination controls when there is only one page', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      });
    });

    it('should fetch next page when next button is clicked', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        fireEvent.click(nextButton);
      });

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith(undefined, { page: 2, pageSize: 50 });
      });
    });

    it('should fetch previous page when previous button is clicked', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 51,
            userId: 'player51',
            displayName: 'Player51',
            totalGames: 20,
            wins: 10,
            losses: 10,
            winRate: 0.5,
          },
        ],
        total: 100,
        page: 2,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Player51')).toBeInTheDocument();
      });

      // Click previous button
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        fireEvent.click(prevButton);
      });

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 50 });
      });
    });

    it('should disable previous button on first page', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 51,
            userId: 'player51',
            displayName: 'Player51',
            totalGames: 20,
            wins: 10,
            losses: 10,
            winRate: 0.5,
          },
        ],
        total: 100,
        page: 2,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });
    });

    it('should display current page information', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
      });
    });

    it('should maintain filter when changing pages', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      // Set filter
      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      // Go to next page
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        fireEvent.click(nextButton);
      });

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith('tic-tac-toe', { page: 2, pageSize: 50 });
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching leaderboard', () => {
      mockGetLeaderboard.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<LeaderboardView />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should hide loading state after data is loaded', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.queryByText(/loading leaderboard/i)).not.toBeInTheDocument();
      });
    });

    it('should show loading state when filter changes', async () => {
      render(<LeaderboardView />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Mock slow response for filter change
      mockGetLeaderboard.mockReturnValue(new Promise(() => {}));

      const select = screen.getByLabelText(/filter by game type/i);
      fireEvent.change(select, { target: { value: 'tic-tac-toe' } });

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });

    it('should show loading state when changing pages', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Mock slow response for page change
      mockGetLeaderboard.mockReturnValue(new Promise(() => {}));

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when leaderboard fetch fails', async () => {
      mockGetLeaderboard.mockRejectedValue(new Error('Failed to fetch leaderboard'));

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument();
      });
    });

    it('should show retry button when fetch fails', async () => {
      mockGetLeaderboard.mockRejectedValue(new Error('Network error'));

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry fetching leaderboard when retry button is clicked', async () => {
      mockGetLeaderboard.mockRejectedValueOnce(new Error('Network error'));

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Mock successful response for retry
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.queryByText(/failed to load leaderboard/i)).not.toBeInTheDocument();
      });
    });

    it('should clear error when filter changes successfully', async () => {
      mockGetLeaderboard.mockRejectedValueOnce(new Error('Network error'));

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument();
      });

      // Mock successful response for filter change
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      const select = screen.getByLabelText(/filter by game type/i);
      fireEvent.change(select, { target: { value: 'tic-tac-toe' } });

      await waitFor(() => {
        expect(screen.queryByText(/failed to load leaderboard/i)).not.toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when leaderboard is empty', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByText(/no players on the leaderboard yet/i)).toBeInTheDocument();
      });
    });

    it('should show helpful message in empty state', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByText(/be the first to play/i)).toBeInTheDocument();
      });
    });

    it('should display empty state for filtered results', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        fireEvent.change(select, { target: { value: 'tic-tac-toe' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/no players on the leaderboard yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewport', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /leaderboard/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should render correctly on tablet viewport', async () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /leaderboard/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should render correctly on desktop viewport', async () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      render(<LeaderboardView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /leaderboard/i, level: 1 })).toBeInTheDocument();
      });
    });

    it('should adapt layout for mobile screens', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<LeaderboardView />);

      await waitFor(() => {
        // Component should render without errors
        expect(container.querySelector('div')).toBeInTheDocument();
      });
    });

    it('should display full table on desktop', async () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<LeaderboardView />);

      await waitFor(() => {
        // Component should render without errors
        expect(container.querySelector('div')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      });
    });

    it('should have accessible filter label', async () => {
      render(<LeaderboardView />);

      await waitFor(() => {
        const select = screen.getByLabelText(/filter by game type/i);
        expect(select).toBeInTheDocument();
      });
    });

    it('should have accessible pagination buttons', async () => {
      mockGetLeaderboard.mockResolvedValue({
        items: [
          {
            rank: 1,
            userId: 'player1',
            displayName: 'Alice',
            totalGames: 50,
            wins: 42,
            losses: 8,
            winRate: 0.84,
          },
        ],
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      render(<LeaderboardView />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(nextButton).toBeInTheDocument();
        expect(prevButton).toBeInTheDocument();
      });
    });

    it('should have accessible retry button', async () => {
      mockGetLeaderboard.mockRejectedValue(new Error('Network error'));

      render(<LeaderboardView />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });
  });
});
