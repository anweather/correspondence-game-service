import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { PlayerView } from '../PlayerView';
import { PlayerProvider } from '../../context/PlayerContext';
import type { GameState } from '../../types/game';

// Mock child components
vi.mock('../../components/GameDetail/GameDetail', () => ({
  GameDetail: ({ game, currentPlayerId }: any) => (
    <div data-testid="game-detail">
      <div>Game Detail Mock</div>
      <div>Game ID: {game.gameId}</div>
      <div>Current Player: {currentPlayerId || 'none'}</div>
    </div>
  ),
}));

vi.mock('../../components/MoveInput/MoveInput', () => ({
  MoveInput: ({ gameType, playerId, enabled, onSubmit }: any) => (
    <div data-testid="move-input">
      <div>Move Input Mock</div>
      <div>Game Type: {gameType}</div>
      <div>Player ID: {playerId}</div>
      <div>Enabled: {enabled ? 'yes' : 'no'}</div>
      <button onClick={() => onSubmit({ action: 'test', parameters: {} })}>
        Submit Move
      </button>
    </div>
  ),
}));

// Mock GameClient
const mockGetGameTypes = vi.fn().mockResolvedValue([
  {
    type: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    description: 'Classic game',
    minPlayers: 2,
    maxPlayers: 2,
  },
]);

const mockCreateGame = vi.fn();
const mockJoinGame = vi.fn();
const mockGetGame = vi.fn();
const mockMakeMove = vi.fn();

vi.mock('../../api/gameClient', () => ({
  GameClient: class {
    getGameTypes = mockGetGameTypes;
    createGame = mockCreateGame;
    joinGame = mockJoinGame;
    getGame = mockGetGame;
    makeMove = mockMakeMove;
  },
}));

const mockGame: GameState = {
  gameId: 'game-123',
  gameType: 'tic-tac-toe',
  lifecycle: 'active',
  players: [
    { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
    { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
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

describe('PlayerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('Game Setup Screen', () => {
    beforeEach(() => {
      // Set up localStorage to simulate a logged-in player (but no current game)
      localStorage.setItem('player.id', '"player-1"');
      localStorage.setItem('player.name', '"Alice"');
    });

    it('should render game setup screen when no game is loaded', () => {
      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      expect(screen.getByText(/create new game/i)).toBeInTheDocument();
      expect(screen.getByText(/join existing game/i)).toBeInTheDocument();
    });

    it('should render create game form', async () => {
      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /create game/i })).toBeInTheDocument();
    });

    it('should render join game form', async () => {
      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();
    });

    it('should create game when create form is submitted', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateGame).toHaveBeenCalledWith('tic-tac-toe', {});
      });
    });

    it('should join game when join form is submitted', async () => {
      const user = userEvent.setup();
      mockJoinGame.mockResolvedValue({
        ...mockGame,
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
        ],
      });

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();
      });

      const gameIdInput = screen.getByLabelText(/game id/i);
      const joinButton = screen.getByRole('button', { name: /join game/i });

      await user.type(gameIdInput, 'game-123');
      await user.click(joinButton);

      await waitFor(() => {
        expect(mockJoinGame).toHaveBeenCalledWith(
          'game-123',
          expect.objectContaining({ name: 'Alice' })
        );
      });
    });

    it('should display error when create game fails', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockRejectedValue(new Error('Failed to create game'));

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create game/i)).toBeInTheDocument();
      });
    });

    it('should display error when join game fails', async () => {
      const user = userEvent.setup();
      mockJoinGame.mockRejectedValue(new Error('Game not found'));

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();
      });

      const gameIdInput = screen.getByLabelText(/game id/i);
      const joinButton = screen.getByRole('button', { name: /join game/i });

      await user.type(gameIdInput, 'invalid-game');
      await user.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText(/game not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Game View', () => {
    beforeEach(() => {
      // Set up localStorage to simulate a logged-in player (but no current game yet)
      localStorage.setItem('player.id', '"player-1"');
      localStorage.setItem('player.name', '"Alice"');
      // Don't set currentGame - let tests create/join games
      mockGetGame.mockResolvedValue(mockGame);
    });

    it('should render game view when game is loaded', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Select game type and create game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      // Verify we're now in game view (not setup screen)
      await waitFor(() => {
        expect(screen.queryByText(/create new game/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('game-detail')).toBeInTheDocument();
      });
    });

    it('should render player welcome message', async () => {
      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Player is already logged in via beforeEach
      await waitFor(() => {
        expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument();
      });
    });

    it('should render GameDetail component with current player ID', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('game-detail')).toBeInTheDocument();
        expect(screen.getByText(/current player: player-1/i)).toBeInTheDocument();
      });
    });

    it('should render MoveInput component', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('move-input')).toBeInTheDocument();
      });
    });

    it('should enable move input when it is player turn', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue({
        ...mockGame,
        players: [{ id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' }],
        currentPlayerIndex: 0,
      });

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/enabled: yes/i)).toBeInTheDocument();
      });
    });

    it('should disable move input when it is not player turn', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue({
        ...mockGame,
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
        ],
        currentPlayerIndex: 1, // Bob's turn
      });

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/enabled: no/i)).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });
  });

  describe('Move Submission', () => {
    beforeEach(() => {
      // Set up localStorage to simulate a logged-in player
      localStorage.setItem('player.id', '"player-1"');
      localStorage.setItem('player.name', '"Alice"');
      mockGetGame.mockResolvedValue(mockGame);
    });

    it('should submit move when move input is submitted', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);
      mockMakeMove.mockResolvedValue({
        ...mockGame,
        version: 2,
        moveHistory: [
          {
            playerId: 'player-1',
            timestamp: '2024-01-01T00:00:00Z',
            action: 'test',
            parameters: {},
          },
        ],
      });

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('move-input')).toBeInTheDocument();
      });

      const submitMoveButton = screen.getByRole('button', { name: /submit move/i });
      await user.click(submitMoveButton);

      await waitFor(() => {
        expect(mockMakeMove).toHaveBeenCalledWith(
          'game-123',
          'player-1',
          { action: 'test', parameters: {} },
          1
        );
      });
    });

    it('should display error when move submission fails', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);
      mockMakeMove.mockRejectedValue(new Error('Invalid move'));

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('move-input')).toBeInTheDocument();
      });

      const submitMoveButton = screen.getByRole('button', { name: /submit move/i });
      await user.click(submitMoveButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid move/i)).toBeInTheDocument();
      });
    });
  });

  describe('Optimistic Locking Retry', () => {
    beforeEach(() => {
      // Set up localStorage to simulate a logged-in player
      localStorage.setItem('player.id', '"player-1"');
      localStorage.setItem('player.name', '"Alice"');
      mockGetGame.mockResolvedValue(mockGame);
    });

    it('should display error and allow retry when version conflict occurs', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);
      mockMakeMove.mockRejectedValueOnce(new Error('Version conflict'));

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('move-input')).toBeInTheDocument();
      });

      const submitMoveButton = screen.getByRole('button', { name: /submit move/i });
      await user.click(submitMoveButton);

      await waitFor(() => {
        expect(screen.getByText(/version conflict/i)).toBeInTheDocument();
      });

      // User can retry by clicking refresh and submitting again
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      // Set up localStorage to simulate a logged-in player
      localStorage.setItem('player.id', '"player-1"');
      localStorage.setItem('player.name', '"Alice"');
      mockGetGame.mockResolvedValue(mockGame);
    });

    it('should refresh game when refresh button is clicked', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);
      mockGetGame.mockResolvedValue({
        ...mockGame,
        version: 2,
      });

      render(
        <PlayerProvider>
          <PlayerView />
        </PlayerProvider>
      );

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      // Create a game
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockGetGame).toHaveBeenCalledWith('game-123');
      });
    });
  });
});
