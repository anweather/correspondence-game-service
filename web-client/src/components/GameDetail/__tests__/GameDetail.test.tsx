import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { GameDetail } from '../GameDetail';
import type { GameState } from '../../../types/game';

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
  moveHistory: [
    { playerId: 'p1', timestamp: '2024-01-01T00:02:00Z', action: 'place', parameters: { row: 0, col: 0 } },
    { playerId: 'p2', timestamp: '2024-01-01T00:03:00Z', action: 'place', parameters: { row: 1, col: 1 } },
  ],
  metadata: {},
  version: 3,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:03:00Z',
};

describe('GameDetail', () => {
  describe('Game Metadata', () => {
    it('should render game ID', () => {
      render(<GameDetail game={mockGame} />);

      expect(screen.getByText(/game-123/i)).toBeInTheDocument();
    });

    it('should render game type', () => {
      render(<GameDetail game={mockGame} />);

      expect(screen.getByText(/tic-tac-toe/i)).toBeInTheDocument();
    });

    it('should render game status', () => {
      render(<GameDetail game={mockGame} />);

      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('should render current turn number', () => {
      render(<GameDetail game={mockGame} />);

      // Turn number is based on move history length
      expect(screen.getByText(/turn.*2/i)).toBeInTheDocument();
    });

    it('should render current player name', () => {
      render(<GameDetail game={mockGame} />);

      // currentPlayerIndex is 0, so Alice's turn
      expect(screen.getByText(/alice.*turn/i)).toBeInTheDocument();
    });

    it('should render completed status for completed games', () => {
      const completedGame = { ...mockGame, lifecycle: 'completed' as const };
      render(<GameDetail game={completedGame} />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
  });

  describe('Board SVG Display', () => {
    it('should render board SVG with correct URL', () => {
      render(<GameDetail game={mockGame} />);

      const img = screen.getByRole('img', { name: /board/i });
      expect(img).toHaveAttribute('src', '/api/games/game-123/board.svg?v=3');
    });

    it('should render board with alt text', () => {
      render(<GameDetail game={mockGame} />);

      const img = screen.getByRole('img', { name: /board/i });
      expect(img).toHaveAttribute('alt');
    });

    it('should update board URL when game ID changes', () => {
      const { rerender } = render(<GameDetail game={mockGame} />);

      const updatedGame = { ...mockGame, gameId: 'game-456' };
      rerender(<GameDetail game={updatedGame} />);

      const img = screen.getByRole('img', { name: /board/i });
      expect(img).toHaveAttribute('src', '/api/games/game-456/board.svg?v=3');
    });
  });

  describe('Player List', () => {
    it('should render all players', () => {
      render(<GameDetail game={mockGame} />);

      const playerList = screen.getByText('Players').closest('div');
      expect(playerList).toHaveTextContent('Alice');
      expect(playerList).toHaveTextContent('Bob');
    });

    it('should display player IDs', () => {
      render(<GameDetail game={mockGame} />);

      expect(screen.getByText(/p1/)).toBeInTheDocument();
      expect(screen.getByText(/p2/)).toBeInTheDocument();
    });

    it('should highlight current player turn', () => {
      render(<GameDetail game={mockGame} />);

      // Find the player list section
      const playerList = screen.getByText('Players').closest('div');
      const aliceElements = screen.getAllByText('Alice');
      
      // Find Alice in the player list (not move history)
      const aliceInPlayerList = aliceElements.find(el => 
        playerList?.contains(el)
      );
      
      const aliceElement = aliceInPlayerList?.closest('li');
      expect(aliceElement?.className).toContain('currentTurn');
    });

    it('should not highlight non-current players', () => {
      render(<GameDetail game={mockGame} />);

      // Find the player list section
      const playerList = screen.getByText('Players').closest('div');
      const bobElements = screen.getAllByText('Bob');
      
      // Find Bob in the player list (not move history)
      const bobInPlayerList = bobElements.find(el => 
        playerList?.contains(el)
      );
      
      const bobElement = bobInPlayerList?.closest('li');
      expect(bobElement?.className).not.toContain('currentTurn');
    });

    it('should show turn order numbers', () => {
      render(<GameDetail game={mockGame} />);

      // Players should be numbered 1, 2, etc.
      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText(/2\./)).toBeInTheDocument();
    });

    it('should handle games with no players', () => {
      const gameWithNoPlayers = { ...mockGame, players: [] };
      render(<GameDetail game={gameWithNoPlayers} />);

      expect(screen.getByText(/no players/i)).toBeInTheDocument();
    });

    it('should handle games with single player', () => {
      const singlePlayerGame = {
        ...mockGame,
        players: [{ id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' }],
      };
      render(<GameDetail game={singlePlayerGame} />);

      const playerList = screen.getByText('Players').closest('div');
      expect(playerList).toHaveTextContent('Alice');
      
      // Bob should not appear in player list
      const bobElements = screen.queryAllByText('Bob');
      const bobInPlayerList = bobElements.find(el => playerList?.contains(el));
      expect(bobInPlayerList).toBeUndefined();
    });
  });

  describe('Move History', () => {
    it('should render all moves in chronological order', () => {
      render(<GameDetail game={mockGame} />);

      const moves = screen.getAllByText(/place/i);
      expect(moves).toHaveLength(2);
    });

    it('should display player name for each move', () => {
      render(<GameDetail game={mockGame} />);

      // Both Alice and Bob should appear in move history
      const moveHistory = screen.getByText(/move history/i).closest('div');
      expect(moveHistory).toHaveTextContent('Alice');
      expect(moveHistory).toHaveTextContent('Bob');
    });

    it('should display move action', () => {
      render(<GameDetail game={mockGame} />);

      const moves = screen.getAllByText(/place/i);
      expect(moves.length).toBeGreaterThan(0);
    });

    it('should display move parameters', () => {
      render(<GameDetail game={mockGame} />);

      // Check for row and col parameters (text is split across elements)
      const moveHistory = screen.getByText('Move History').closest('div');
      expect(moveHistory).toHaveTextContent('row: 0');
      expect(moveHistory).toHaveTextContent('col: 0');
      expect(moveHistory).toHaveTextContent('row: 1');
      expect(moveHistory).toHaveTextContent('col: 1');
    });

    it('should show empty state when no moves', () => {
      const gameWithNoMoves = { ...mockGame, moveHistory: [] };
      render(<GameDetail game={gameWithNoMoves} />);

      expect(screen.getByText(/no moves/i)).toBeInTheDocument();
    });

    it('should display moves in correct order (oldest first)', () => {
      render(<GameDetail game={mockGame} />);

      const moveElements = screen.getAllByText(/place/i);
      const firstMove = moveElements[0].closest('div');
      const secondMove = moveElements[1].closest('div');

      // First move should contain Alice's move (row 0, col 0)
      expect(firstMove).toHaveTextContent('Alice');
      expect(firstMove).toHaveTextContent('row: 0');

      // Second move should contain Bob's move (row 1, col 1)
      expect(secondMove).toHaveTextContent('Bob');
      expect(secondMove).toHaveTextContent('row: 1');
    });

    it('should display turn number for each move', () => {
      render(<GameDetail game={mockGame} />);

      // Moves should be numbered starting from 1
      expect(screen.getByText(/turn 1/i)).toBeInTheDocument();
      expect(screen.getByText(/turn 2/i)).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call onRefresh when refresh button is clicked', () => {
      const onRefresh = vi.fn();
      render(<GameDetail game={mockGame} onRefresh={onRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      refreshButton.click();

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not render refresh button when onRefresh is not provided', () => {
      render(<GameDetail game={mockGame} />);

      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });
  });

  describe('Admin Controls', () => {
    it('should not show admin controls by default', () => {
      render(<GameDetail game={mockGame} />);

      expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    });

    it('should show admin controls when showAdminControls is true', () => {
      render(<GameDetail game={mockGame} showAdminControls={true} />);

      expect(screen.getByRole('heading', { name: /admin controls/i })).toBeInTheDocument();
    });

    it('should not show admin controls when showAdminControls is false', () => {
      render(<GameDetail game={mockGame} showAdminControls={false} />);

      expect(screen.queryByText(/admin controls/i)).not.toBeInTheDocument();
    });
  });

  describe('Current Player Indicator', () => {
    it('should indicate when it is player 1 turn', () => {
      const game = { ...mockGame, currentPlayerIndex: 0 };
      render(<GameDetail game={game} currentPlayerId="p1" />);

      expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    });

    it('should indicate when it is not current player turn', () => {
      const game = { ...mockGame, currentPlayerIndex: 1 };
      render(<GameDetail game={game} currentPlayerId="p1" />);

      expect(screen.getByText(/waiting/i)).toBeInTheDocument();
    });

    it('should not show turn indicator when currentPlayerId is not provided', () => {
      render(<GameDetail game={mockGame} />);

      expect(screen.queryByText(/your turn/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/waiting/i)).not.toBeInTheDocument();
    });
  });
});
