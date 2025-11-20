import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { PlayerPanel } from '../PlayerPanel';
import type { GameState } from '../../../types/game';
import userEvent from '@testing-library/user-event';

const mockGame: GameState = {
  gameId: 'game-123',
  gameType: 'tic-tac-toe',
  lifecycle: 'active',
  players: [
    { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
    { id: 'p2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
  ],
  currentPlayerIndex: 0,
  phase: 'playing',
  board: { spaces: [], metadata: {} },
  moveHistory: [],
  metadata: {},
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('PlayerPanel', () => {
  describe('Player List Rendering', () => {
    it('should render all players in the game', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should display player IDs', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.getByText(/p1/)).toBeInTheDocument();
      expect(screen.getByText(/p2/)).toBeInTheDocument();
    });

    it('should render impersonate button for each player', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const impersonateButtons = screen.getAllByRole('button', { name: /impersonate/i });
      expect(impersonateButtons).toHaveLength(2);
    });

    it('should handle games with no players', () => {
      const gameWithNoPlayers = { ...mockGame, players: [] };
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={gameWithNoPlayers}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.getByText(/no players/i)).toBeInTheDocument();
    });

    it('should render player list heading', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.getByRole('heading', { name: /player impersonation/i })).toBeInTheDocument();
    });
  });

  describe('Impersonate Button Clicks', () => {
    it('should call onImpersonate with player ID when button is clicked', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const impersonateButtons = screen.getAllByRole('button', { name: /impersonate/i });
      await user.click(impersonateButtons[0]);

      expect(onImpersonate).toHaveBeenCalledWith('p1');
    });

    it('should call onImpersonate with correct player ID for second player', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const impersonateButtons = screen.getAllByRole('button', { name: /impersonate/i });
      await user.click(impersonateButtons[1]);

      expect(onImpersonate).toHaveBeenCalledWith('p2');
    });

    it('should allow switching between impersonated players', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      const { rerender } = render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer="p1"
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const impersonateButtons = screen.getAllByRole('button', { name: /impersonate/i });
      await user.click(impersonateButtons[1]);

      expect(onImpersonate).toHaveBeenCalledWith('p2');

      // Rerender with new impersonated player
      rerender(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer="p2"
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      // Verify the visual indicator updated
      const playerItems = screen.getAllByRole('listitem');
      expect(playerItems[1].className).toContain('impersonated');
    });
  });

  describe('Visual Indicator for Impersonated Player', () => {
    it('should highlight impersonated player', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer="p1"
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const playerItems = screen.getAllByRole('listitem');
      expect(playerItems[0].className).toContain('impersonated');
    });

    it('should not highlight non-impersonated players', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer="p1"
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const playerItems = screen.getAllByRole('listitem');
      expect(playerItems[1].className).not.toContain('impersonated');
    });

    it('should show active indicator text for impersonated player', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer="p1"
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('should not show active indicator when no player is impersonated', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });

    it('should update visual indicator when impersonation changes', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      const { rerender } = render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer="p1"
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      let playerItems = screen.getAllByRole('listitem');
      expect(playerItems[0].className).toContain('impersonated');

      rerender(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer="p2"
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      playerItems = screen.getAllByRole('listitem');
      expect(playerItems[0].className).not.toContain('impersonated');
      expect(playerItems[1].className).toContain('impersonated');
    });
  });

  describe('Add Player Form', () => {
    it('should render add player form', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.getByPlaceholderText(/player name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add player/i })).toBeInTheDocument();
    });

    it('should call onAddPlayer with player name when form is submitted', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const input = screen.getByPlaceholderText(/player name/i);
      const addButton = screen.getByRole('button', { name: /add player/i });

      await user.type(input, 'Charlie');
      await user.click(addButton);

      expect(onAddPlayer).toHaveBeenCalledWith('Charlie');
    });

    it('should clear input after adding player', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn().mockResolvedValue(undefined);

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const input = screen.getByPlaceholderText(/player name/i) as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: /add player/i });

      await user.type(input, 'Charlie');
      await user.click(addButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should not call onAddPlayer with empty name', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const addButton = screen.getByRole('button', { name: /add player/i });
      await user.click(addButton);

      expect(onAddPlayer).not.toHaveBeenCalled();
    });

    it('should not call onAddPlayer with whitespace-only name', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const input = screen.getByPlaceholderText(/player name/i);
      const addButton = screen.getByRole('button', { name: /add player/i });

      await user.type(input, '   ');
      await user.click(addButton);

      expect(onAddPlayer).not.toHaveBeenCalled();
    });

    it('should trim whitespace from player name', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const input = screen.getByPlaceholderText(/player name/i);
      const addButton = screen.getByRole('button', { name: /add player/i });

      await user.type(input, '  Charlie  ');
      await user.click(addButton);

      expect(onAddPlayer).toHaveBeenCalledWith('Charlie');
    });

    it('should allow adding multiple players sequentially', async () => {
      const user = userEvent.setup();
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn().mockResolvedValue(undefined);

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const input = screen.getByPlaceholderText(/player name/i);
      const addButton = screen.getByRole('button', { name: /add player/i });

      await user.type(input, 'Charlie');
      await user.click(addButton);

      await waitFor(() => {
        expect(onAddPlayer).toHaveBeenCalledWith('Charlie');
      });

      await user.type(input, 'Diana');
      await user.click(addButton);

      await waitFor(() => {
        expect(onAddPlayer).toHaveBeenCalledWith('Diana');
      });

      expect(onAddPlayer).toHaveBeenCalledTimes(2);
    });
  });

  describe('Player Order', () => {
    it('should display players in order', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const playerItems = screen.getAllByRole('listitem');
      expect(playerItems[0]).toHaveTextContent('Alice');
      expect(playerItems[1]).toHaveTextContent('Bob');
    });

    it('should maintain player order with multiple players', () => {
      const gameWithManyPlayers = {
        ...mockGame,
        players: [
          { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'p2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
          { id: 'p3', name: 'Charlie', joinedAt: '2024-01-01T00:02:00Z' },
          { id: 'p4', name: 'Diana', joinedAt: '2024-01-01T00:03:00Z' },
        ],
      };

      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={gameWithManyPlayers}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const playerItems = screen.getAllByRole('listitem');
      expect(playerItems).toHaveLength(4);
      expect(playerItems[0]).toHaveTextContent('Alice');
      expect(playerItems[1]).toHaveTextContent('Bob');
      expect(playerItems[2]).toHaveTextContent('Charlie');
      expect(playerItems[3]).toHaveTextContent('Diana');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible player list', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('should have accessible form controls', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const input = screen.getByPlaceholderText(/player name/i);
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have accessible buttons', () => {
      const onImpersonate = vi.fn();
      const onAddPlayer = vi.fn();

      render(
        <PlayerPanel
          game={mockGame}
          impersonatedPlayer={null}
          onImpersonate={onImpersonate}
          onAddPlayer={onAddPlayer}
        />
      );

      const impersonateButtons = screen.getAllByRole('button', { name: /impersonate/i });
      expect(impersonateButtons).toHaveLength(2);

      const addButton = screen.getByRole('button', { name: /add player/i });
      expect(addButton).toBeInTheDocument();
    });
  });
});
