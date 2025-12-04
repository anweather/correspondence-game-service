import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteModal } from '../InviteModal';

describe('InviteModal', () => {
  const mockOnClose = vi.fn();
  const mockOnInvite = vi.fn();
  const mockPlayers = [
    { userId: 'user1', displayName: 'player_one' },
    { userId: 'user2', displayName: 'player_two' },
    { userId: 'user3', displayName: 'player_three' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should render modal when open', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      expect(screen.getByText(/invite player/i)).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      render(
        <InviteModal
          isOpen={false}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render list of available players', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      expect(screen.getByText('player_one')).toBeInTheDocument();
      expect(screen.getByText('player_two')).toBeInTheDocument();
      expect(screen.getByText('player_three')).toBeInTheDocument();
    });

    it('should show empty state when no players available', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={[]}
        />
      );

      expect(screen.getByText(/no players available/i)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
          loading={true}
        />
      );

      expect(screen.getByText(/loading players/i)).toBeInTheDocument();
    });
  });

  describe('Player Selection', () => {
    it('should allow selecting a player', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const playerButton = screen.getByText('player_one').closest('button');
      expect(playerButton).toBeInTheDocument();
      
      if (playerButton) {
        fireEvent.click(playerButton);
        expect(playerButton).toHaveClass(/selected/i);
      }
    });

    it('should allow deselecting a player', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const playerButton = screen.getByText('player_one').closest('button');
      
      if (playerButton) {
        // Select
        fireEvent.click(playerButton);
        expect(playerButton).toHaveClass(/selected/i);
        
        // Deselect
        fireEvent.click(playerButton);
        expect(playerButton).not.toHaveClass(/selected/i);
      }
    });

    it('should allow selecting multiple players', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const player1Button = screen.getByText('player_one').closest('button');
      const player2Button = screen.getByText('player_two').closest('button');
      
      if (player1Button && player2Button) {
        fireEvent.click(player1Button);
        fireEvent.click(player2Button);
        
        expect(player1Button).toHaveClass(/selected/i);
        expect(player2Button).toHaveClass(/selected/i);
      }
    });

    it('should disable invite button when no player selected', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const inviteButton = screen.getByRole('button', { name: /send invite/i });
      expect(inviteButton).toBeDisabled();
    });

    it('should enable invite button when player selected', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const playerButton = screen.getByText('player_one').closest('button');
      if (playerButton) {
        fireEvent.click(playerButton);
      }

      const inviteButton = screen.getByRole('button', { name: /send invite/i });
      expect(inviteButton).not.toBeDisabled();
    });
  });

  describe('Invitation Submission', () => {
    it('should call onInvite with selected player IDs', async () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const playerButton = screen.getByText('player_one').closest('button');
      if (playerButton) {
        fireEvent.click(playerButton);
      }

      const inviteButton = screen.getByRole('button', { name: /send invite/i });
      fireEvent.click(inviteButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalledWith(['user1']);
      });
    });

    it('should call onInvite with multiple selected player IDs', async () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const player1Button = screen.getByText('player_one').closest('button');
      const player2Button = screen.getByText('player_two').closest('button');
      
      if (player1Button && player2Button) {
        fireEvent.click(player1Button);
        fireEvent.click(player2Button);
      }

      const inviteButton = screen.getByRole('button', { name: /send invite/i });
      fireEvent.click(inviteButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalledWith(['user1', 'user2']);
      });
    });

    it('should disable buttons during loading', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
          loading={true}
        />
      );

      const inviteButton = screen.getByRole('button', { name: /loading/i });
      expect(inviteButton).toBeDisabled();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should call onClose when cancel button clicked', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when modal overlay clicked', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset selection after successful invite', async () => {
      const { rerender } = render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const playerButton = screen.getByText('player_one').closest('button');
      if (playerButton) {
        fireEvent.click(playerButton);
        expect(playerButton).toHaveClass(/selected/i);
      }

      const inviteButton = screen.getByRole('button', { name: /send invite/i });
      fireEvent.click(inviteButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalled();
      });

      // Rerender to simulate modal closing and reopening
      rerender(
        <InviteModal
          isOpen={false}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      rerender(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      // Selection should be cleared
      const playerButtonAfter = screen.getByText('player_one').closest('button');
      if (playerButtonAfter) {
        expect(playerButtonAfter).not.toHaveClass(/selected/i);
      }
    });
  });

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
          error="Failed to send invitation"
        />
      );

      expect(screen.getByText(/failed to send invitation/i)).toBeInTheDocument();
    });

    it('should clear error when modal is closed', () => {
      const { rerender } = render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
          error="Failed to send invitation"
        />
      );

      expect(screen.getByText(/failed to send invitation/i)).toBeInTheDocument();

      rerender(
        <InviteModal
          isOpen={false}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
          error="Failed to send invitation"
        />
      );

      expect(screen.queryByText(/failed to send invitation/i)).not.toBeInTheDocument();
    });

    it('should allow retrying after error', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
          error="Failed to send invitation"
        />
      );

      const playerButton = screen.getByText('player_one').closest('button');
      if (playerButton) {
        fireEvent.click(playerButton);
      }

      const inviteButton = screen.getByRole('button', { name: /send invite/i });
      expect(inviteButton).not.toBeDisabled();
      
      fireEvent.click(inviteButton);
      expect(mockOnInvite).toHaveBeenCalled();
    });
  });

  describe('Search/Filter Functionality', () => {
    it('should render search input', () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      expect(screen.getByPlaceholderText(/search players/i)).toBeInTheDocument();
    });

    it('should filter players based on search input', async () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search players/i);
      fireEvent.change(searchInput, { target: { value: 'one' } });

      await waitFor(() => {
        expect(screen.getByText('player_one')).toBeInTheDocument();
        expect(screen.queryByText('player_two')).not.toBeInTheDocument();
        expect(screen.queryByText('player_three')).not.toBeInTheDocument();
      });
    });

    it('should show no results message when search has no matches', async () => {
      render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search players/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/no players found/i)).toBeInTheDocument();
      });
    });

    it('should clear search when modal is closed', () => {
      const { rerender } = render(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search players/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'one' } });
      expect(searchInput.value).toBe('one');

      rerender(
        <InviteModal
          isOpen={false}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      rerender(
        <InviteModal
          isOpen={true}
          gameId="game123"
          onClose={mockOnClose}
          onInvite={mockOnInvite}
          availablePlayers={mockPlayers}
        />
      );

      const searchInputAfter = screen.getByPlaceholderText(/search players/i) as HTMLInputElement;
      expect(searchInputAfter.value).toBe('');
    });
  });
});
