import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameHistory } from '../GameHistory';
import type { GameState, GameHistoryFilters } from '../../../types/game';

describe('GameHistory', () => {
  const mockGames: GameState[] = [
    {
      gameId: 'game1',
      gameType: 'tic-tac-toe',
      lifecycle: 'completed',
      players: [
        { id: 'player1', name: 'Alice', joinedAt: '2024-01-01T10:00:00Z' },
        { id: 'player2', name: 'Bob', joinedAt: '2024-01-01T10:01:00Z' },
      ],
      currentPlayerIndex: 0,
      phase: 'game_over',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: { gameName: 'Quick Game', gameDescription: 'A quick match' },
      version: 5,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:15:00Z',
      winner: 'player1',
    },
    {
      gameId: 'game2',
      gameType: 'connect-four',
      lifecycle: 'completed',
      players: [
        { id: 'player1', name: 'Alice', joinedAt: '2024-01-02T14:00:00Z' },
        { id: 'player3', name: 'Charlie', joinedAt: '2024-01-02T14:01:00Z' },
      ],
      currentPlayerIndex: 1,
      phase: 'game_over',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: { gameName: 'Connect Four Battle' },
      version: 12,
      createdAt: '2024-01-02T14:00:00Z',
      updatedAt: '2024-01-02T14:30:00Z',
      winner: 'player3',
    },
    {
      gameId: 'game3',
      gameType: 'tic-tac-toe',
      lifecycle: 'completed',
      players: [
        { id: 'player1', name: 'Alice', joinedAt: '2024-01-03T09:00:00Z' },
        { id: 'player4', name: 'Dave', joinedAt: '2024-01-03T09:01:00Z' },
      ],
      currentPlayerIndex: 0,
      phase: 'game_over',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      version: 9,
      createdAt: '2024-01-03T09:00:00Z',
      updatedAt: '2024-01-03T09:20:00Z',
      winner: null, // Draw
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Game List Rendering', () => {
    it('should render list of games', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" />);

      expect(screen.getByText(/Quick Game/)).toBeInTheDocument();
      expect(screen.getByText(/Connect Four Battle/)).toBeInTheDocument();
    });

    it('should display game type for each game', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" />);

      // Should show formatted game types - use getAllByText since there are multiple instances
      const ticTacToeElements = screen.getAllByText(/Tic Tac Toe/i);
      expect(ticTacToeElements.length).toBeGreaterThan(0);
      
      const connectFourElements = screen.getAllByText(/Connect Four/i);
      expect(connectFourElements.length).toBeGreaterThan(0);
    });

    it('should display opponent names', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" />);

      expect(screen.getByText(/Bob/)).toBeInTheDocument();
      expect(screen.getByText(/Charlie/)).toBeInTheDocument();
      expect(screen.getByText(/Dave/)).toBeInTheDocument();
    });

    it('should display game result (won/lost/draw)', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" />);

      // Game 1: player1 won
      expect(screen.getByText(/Won/i)).toBeInTheDocument();
      
      // Game 2: player1 lost (player3 won)
      expect(screen.getByText(/Lost/i)).toBeInTheDocument();
      
      // Game 3: draw
      expect(screen.getByText(/Draw/i)).toBeInTheDocument();
    });

    it('should display number of turns for each game', () => {
      const gamesWithMoves: GameState[] = [
        {
          ...mockGames[0],
          moveHistory: [
            { playerId: 'player1', timestamp: '2024-01-01T10:05:00Z', action: 'place', parameters: {} },
            { playerId: 'player2', timestamp: '2024-01-01T10:06:00Z', action: 'place', parameters: {} },
            { playerId: 'player1', timestamp: '2024-01-01T10:07:00Z', action: 'place', parameters: {} },
            { playerId: 'player2', timestamp: '2024-01-01T10:08:00Z', action: 'place', parameters: {} },
            { playerId: 'player1', timestamp: '2024-01-01T10:09:00Z', action: 'place', parameters: {} },
          ],
        },
      ];

      render(<GameHistory games={gamesWithMoves} currentUserId="player1" />);

      expect(screen.getByText(/5 turns/i)).toBeInTheDocument();
    });

    it('should display game date', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" />);

      // Should show relative or formatted dates
      // The component might show "2 days ago" or "Jan 1, 2024" etc.
      const dates = screen.getAllByText(/Jan|January|2024|ago/i);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should show game name if available, otherwise default format', () => {
      const gamesWithoutName: GameState[] = [
        {
          ...mockGames[0],
          metadata: {},
        },
      ];

      render(<GameHistory games={gamesWithoutName} currentUserId="player1" />);

      // Should show default format like "Tic Tac Toe Game"
      expect(screen.getByText('Tic Tac Toe Game')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    const mockOnFilterChange = vi.fn();

    it('should render game type filter dropdown', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
    });

    it('should call onFilterChange when game type filter changes', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterSelect = screen.getByLabelText(/game type/i);
      fireEvent.change(filterSelect, { target: { value: 'tic-tac-toe' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ gameType: 'tic-tac-toe' })
      );
    });

    it('should render lifecycle filter dropdown', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should call onFilterChange when lifecycle filter changes', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterSelect = screen.getByLabelText(/status/i);
      fireEvent.change(filterSelect, { target: { value: 'active' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'active' })
      );
    });

    it('should show filtered games based on current filters', () => {
      const filters: GameHistoryFilters = { gameType: 'tic-tac-toe' };
      const filteredGames = mockGames.filter((g) => g.gameType === 'tic-tac-toe');

      render(
        <GameHistory
          games={filteredGames}
          currentUserId="player1"
          filters={filters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Should only show tic-tac-toe games
      expect(screen.getAllByText(/Tic Tac Toe/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Connect Four Battle/)).not.toBeInTheDocument();
    });

    it('should allow clearing filters', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          filters={{ gameType: 'tic-tac-toe' }}
          onFilterChange={mockOnFilterChange}
        />
      );

      const filterSelect = screen.getByLabelText(/game type/i);
      fireEvent.change(filterSelect, { target: { value: '' } });

      // When clearing, the filter key is deleted, so we get an empty object
      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('Pagination', () => {
    const mockOnPageChange = vi.fn();

    it('should render pagination controls when total pages > 1', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 1, pageSize: 10, total: 25, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/page/i)).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('should not render pagination when total pages = 1', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 1, pageSize: 10, total: 3, totalPages: 1 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.queryByText(/page/i)).not.toBeInTheDocument();
    });

    it('should call onPageChange when next button clicked', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 1, pageSize: 10, total: 25, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when previous button clicked', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 2, pageSize: 10, total: 25, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should disable previous button on first page', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 1, pageSize: 10, total: 25, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 3, pageSize: 10, total: 25, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should display current page and total pages', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 2, pageSize: 10, total: 25, totalPages: 3 }}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no games', () => {
      render(<GameHistory games={[]} currentUserId="player1" />);

      expect(screen.getByText(/haven't played any games yet/i)).toBeInTheDocument();
    });

    it('should display helpful message in empty state', () => {
      render(<GameHistory games={[]} currentUserId="player1" />);

      expect(screen.getByText(/haven't played any games yet/i)).toBeInTheDocument();
    });

    it('should not display filters in empty state', () => {
      render(<GameHistory games={[]} currentUserId="player1" />);

      expect(screen.queryByLabelText(/game type/i)).not.toBeInTheDocument();
    });

    it('should display empty state when filtered results are empty', () => {
      render(
        <GameHistory
          games={[]}
          currentUserId="player1"
          filters={{ gameType: 'chess' }}
        />
      );

      expect(screen.getByText(/no games found/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when loading', () => {
      render(<GameHistory games={[]} currentUserId="player1" loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should not display games list when loading', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" loading={true} />);

      expect(screen.queryByText(/Quick Game/)).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop provided', () => {
      render(
        <GameHistory
          games={[]}
          currentUserId="player1"
          error="Failed to load game history"
        />
      );

      expect(screen.getByText(/failed to load game history/i)).toBeInTheDocument();
    });

    it('should not display games list when error', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          error="Network error"
        />
      );

      expect(screen.queryByText(/Quick Game/)).not.toBeInTheDocument();
    });
  });

  describe('Game Click Interaction', () => {
    it('should call onGameClick when game is clicked', () => {
      const mockOnGameClick = vi.fn();

      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          onGameClick={mockOnGameClick}
        />
      );

      const gameCard = screen.getByText(/Quick Game/).closest('div[role="button"]');
      if (gameCard) {
        fireEvent.click(gameCard);
      }

      expect(mockOnGameClick).toHaveBeenCalledWith('game1');
    });

    it('should make game cards keyboard accessible', () => {
      const mockOnGameClick = vi.fn();

      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          onGameClick={mockOnGameClick}
        />
      );

      const gameCard = screen.getByText(/Quick Game/).closest('div[role="button"]');
      if (gameCard) {
        fireEvent.keyDown(gameCard, { key: 'Enter' });
      }

      expect(mockOnGameClick).toHaveBeenCalledWith('game1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" />);

      // Should have a list structure
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should have accessible filter labels', () => {
      render(<GameHistory games={mockGames} currentUserId="player1" />);

      expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should have accessible pagination buttons', () => {
      render(
        <GameHistory
          games={mockGames}
          currentUserId="player1"
          pagination={{ page: 2, pageSize: 10, total: 25, totalPages: 3 }}
        />
      );

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
  });
});
