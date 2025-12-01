import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameFilters } from '../GameFilters';
import type { GameLifecycle } from '../../../types/game';

describe('GameFilters', () => {
  const mockOnFilterChange = vi.fn();

  const defaultFilters = {
    gameType: undefined,
    playerCount: undefined,
    lifecycle: undefined,
    search: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter Controls Rendering', () => {
    it('should render all filter controls', () => {
      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Check for game type filter
      expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();

      // Check for player count filter
      expect(screen.getByLabelText(/players/i)).toBeInTheDocument();

      // Check for status filter
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();

      // Check for search input
      expect(screen.getByPlaceholderText(/search games/i)).toBeInTheDocument();
    });

    it('should render game type options', () => {
      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const gameTypeSelect = screen.getByLabelText(/game type/i);
      expect(gameTypeSelect).toBeInTheDocument();

      // Check for "All" option
      expect(screen.getByRole('option', { name: /all types/i })).toBeInTheDocument();
    });

    it('should render player count options', () => {
      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const playerCountSelect = screen.getByLabelText(/players/i);
      expect(playerCountSelect).toBeInTheDocument();

      // Check for "All" option
      expect(screen.getByRole('option', { name: /any/i })).toBeInTheDocument();
    });

    it('should render status options', () => {
      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toBeInTheDocument();

      // Check for "All" option (exact match to avoid matching "All Types")
      expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
    });
  });

  describe('Filter Change Callbacks', () => {
    it('should call onFilterChange when game type changes', async () => {
      const user = userEvent.setup();

      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const gameTypeSelect = screen.getByLabelText(/game type/i);
      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        gameType: 'tic-tac-toe',
      });
    });

    it('should call onFilterChange when player count changes', async () => {
      const user = userEvent.setup();

      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const playerCountSelect = screen.getByLabelText(/players/i);
      await user.selectOptions(playerCountSelect, '2');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        playerCount: '2',
      });
    });

    it('should call onFilterChange when status changes', async () => {
      const user = userEvent.setup();

      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'waiting_for_players');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        lifecycle: 'waiting_for_players' as GameLifecycle,
      });
    });

    it('should reset filter to undefined when "All" is selected', async () => {
      const user = userEvent.setup();

      const filtersWithGameType = {
        ...defaultFilters,
        gameType: 'tic-tac-toe',
      };

      render(
        <GameFilters
          filters={filtersWithGameType}
          onFilterChange={mockOnFilterChange}
        />
      );

      const gameTypeSelect = screen.getByLabelText(/game type/i);
      await user.selectOptions(gameTypeSelect, '');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithGameType,
        gameType: undefined,
      });
    });
  });

  describe('Search Input', () => {
    it('should call onFilterChange when search input changes', async () => {
      const user = userEvent.setup();

      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search games/i);
      await user.type(searchInput, 'a');

      // Should be called when typing
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'a',
      });
    });

    it('should display current search value', () => {
      const filtersWithSearch = {
        ...defaultFilters,
        search: 'my game',
      };

      render(
        <GameFilters
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search games/i) as HTMLInputElement;
      expect(searchInput.value).toBe('my game');
    });

    it('should clear search when input is cleared', async () => {
      const user = userEvent.setup();

      const filtersWithSearch = {
        ...defaultFilters,
        search: 'test',
      };

      render(
        <GameFilters
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search games/i);
      await user.clear(searchInput);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithSearch,
        search: '',
      });
    });
  });

  describe('Current Filter Display', () => {
    it('should display selected game type', () => {
      const filtersWithGameType = {
        ...defaultFilters,
        gameType: 'connect-four',
      };

      render(
        <GameFilters
          filters={filtersWithGameType}
          onFilterChange={mockOnFilterChange}
        />
      );

      const gameTypeSelect = screen.getByLabelText(/game type/i) as HTMLSelectElement;
      expect(gameTypeSelect.value).toBe('connect-four');
    });

    it('should display selected player count', () => {
      const filtersWithPlayerCount = {
        ...defaultFilters,
        playerCount: '4',
      };

      render(
        <GameFilters
          filters={filtersWithPlayerCount}
          onFilterChange={mockOnFilterChange}
        />
      );

      const playerCountSelect = screen.getByLabelText(/players/i) as HTMLSelectElement;
      expect(playerCountSelect.value).toBe('4');
    });

    it('should display selected status', () => {
      const filtersWithStatus = {
        ...defaultFilters,
        lifecycle: 'active' as GameLifecycle,
      };

      render(
        <GameFilters
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      expect(statusSelect.value).toBe('active');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/players/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search games/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();

      render(
        <GameFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Tab through controls
      await user.tab();
      expect(screen.getByLabelText(/game type/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/players/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/status/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByPlaceholderText(/search games/i)).toHaveFocus();
    });
  });
});
