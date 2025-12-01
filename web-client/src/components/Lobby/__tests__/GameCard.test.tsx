import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { GameCard } from '../GameCard';
import type { GameState } from '../../../types/game';

const mockGame: GameState = {
  gameId: 'game-123',
  gameType: 'tic-tac-toe',
  lifecycle: 'waiting_for_players',
  players: [
    { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
  ],
  currentPlayerIndex: 0,
  phase: 'waiting',
  board: { spaces: [], metadata: {} },
  moveHistory: [],
  metadata: {
    gameName: 'Quick Game',
    gameDescription: 'A fun quick match',
  },
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockActiveGame: GameState = {
  ...mockGame,
  gameId: 'game-456',
  lifecycle: 'active',
  players: [
    { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
    { id: 'p2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
  ],
  phase: 'playing',
  metadata: {
    gameName: 'Competitive Match',
    gameDescription: 'High stakes game',
  },
};

const mockCompletedGame: GameState = {
  ...mockGame,
  gameId: 'game-789',
  lifecycle: 'completed',
  players: [
    { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
    { id: 'p2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
  ],
  phase: 'finished',
  winner: 'p1',
  metadata: {
    gameName: 'Finished Game',
  },
};

describe('GameCard', () => {
  describe('Game Info Display', () => {
    it('should display game name', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText('Quick Game')).toBeInTheDocument();
    });

    it('should display game description when provided', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText('A fun quick match')).toBeInTheDocument();
    });

    it('should not display description when not provided', () => {
      const gameWithoutDescription: GameState = {
        ...mockGame,
        metadata: {
          gameName: 'No Description Game',
        },
      };
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={gameWithoutDescription} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText('No Description Game')).toBeInTheDocument();
      // Description should not be rendered at all
      const card = screen.getByText('No Description Game').closest('div');
      expect(card?.textContent).not.toContain('undefined');
    });

    it('should display game type', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/tic-tac-toe/i)).toBeInTheDocument();
    });

    it('should display player count', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/1\/2/)).toBeInTheDocument();
    });

    it('should display correct player count for full game', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockActiveGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/2\/2/)).toBeInTheDocument();
    });

    it('should display game state', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/waiting_for_players/i)).toBeInTheDocument();
    });

    it('should display active state for active games', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockActiveGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('should display completed state for finished games', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockCompletedGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('should display all required game information together', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      // Verify all key information is present
      expect(screen.getByText('Quick Game')).toBeInTheDocument();
      expect(screen.getByText('A fun quick match')).toBeInTheDocument();
      expect(screen.getByText(/tic-tac-toe/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/2/)).toBeInTheDocument();
      expect(screen.getByText(/waiting_for_players/i)).toBeInTheDocument();
    });
  });

  describe('Join Button', () => {
    it('should display join button for waiting games', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
    });

    it('should call onJoin when join button is clicked', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      const joinButton = screen.getByRole('button', { name: /join/i });
      joinButton.click();

      expect(onJoin).toHaveBeenCalledWith('game-123');
      expect(onJoin).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when join button is clicked', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      const joinButton = screen.getByRole('button', { name: /join/i });
      joinButton.click();

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should not display join button for full games', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockActiveGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    });

    it('should not display join button for completed games', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockCompletedGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    });

    it('should display spectate button for full active games', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockActiveGame} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when card is clicked', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);

      const card = screen.getByText('Quick Game').closest('div');
      card?.click();

      expect(onClick).toHaveBeenCalledWith('game-123');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick with correct game ID', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={mockActiveGame} onJoin={onJoin} onClick={onClick} />);

      const card = screen.getByText('Competitive Match').closest('div');
      card?.click();

      expect(onClick).toHaveBeenCalledWith('game-456');
    });

    it('should be clickable for all game states', () => {
      const onJoin = vi.fn();
      const onClick = vi.fn();

      const { rerender } = render(<GameCard game={mockGame} onJoin={onJoin} onClick={onClick} />);
      
      let card = screen.getByText('Quick Game').closest('div');
      card?.click();
      expect(onClick).toHaveBeenCalledWith('game-123');

      onClick.mockClear();
      rerender(<GameCard game={mockActiveGame} onJoin={onJoin} onClick={onClick} />);
      
      card = screen.getByText('Competitive Match').closest('div');
      card?.click();
      expect(onClick).toHaveBeenCalledWith('game-456');

      onClick.mockClear();
      rerender(<GameCard game={mockCompletedGame} onJoin={onJoin} onClick={onClick} />);
      
      card = screen.getByText('Finished Game').closest('div');
      card?.click();
      expect(onClick).toHaveBeenCalledWith('game-789');
    });
  });

  describe('Edge Cases', () => {
    it('should handle game with no metadata gracefully', () => {
      const gameWithoutMetadata: GameState = {
        ...mockGame,
        metadata: {},
      };
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={gameWithoutMetadata} onJoin={onJoin} onClick={onClick} />);

      // Should still render the card
      expect(screen.getByText(/tic-tac-toe/i)).toBeInTheDocument();
    });

    it('should handle game with no players', () => {
      const gameWithNoPlayers: GameState = {
        ...mockGame,
        players: [],
      };
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={gameWithNoPlayers} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/0\/2/)).toBeInTheDocument();
    });

    it('should handle long game names gracefully', () => {
      const gameWithLongName: GameState = {
        ...mockGame,
        metadata: {
          gameName: 'This is a very long game name that should be handled properly by the component',
        },
      };
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={gameWithLongName} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/This is a very long game name/)).toBeInTheDocument();
    });

    it('should handle long descriptions gracefully', () => {
      const gameWithLongDescription: GameState = {
        ...mockGame,
        metadata: {
          gameName: 'Test Game',
          gameDescription: 'This is a very long description that goes on and on and should be handled properly by the component without breaking the layout or causing issues',
        },
      };
      const onJoin = vi.fn();
      const onClick = vi.fn();

      render(<GameCard game={gameWithLongDescription} onJoin={onJoin} onClick={onClick} />);

      expect(screen.getByText(/This is a very long description/)).toBeInTheDocument();
    });
  });
});
