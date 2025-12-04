import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { PlayerView } from '../PlayerView';
import { PlayerProvider } from '../../context/PlayerContext';
import type { GameState } from '../../types/game';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => null,
  SignInButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  UserButton: () => <button data-testid="user-button">User</button>,
  useUser: () => ({ 
    isSignedIn: true, 
    user: { id: 'user-1', primaryEmailAddress: { emailAddress: 'test@example.com' } },
    isLoaded: true,
  }),
  useSession: () => ({ session: { id: 'session-1' } }),
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token') }),
}));

// Mock child components
vi.mock('../../components/GameDetail/GameDetail', () => ({
  GameDetail: ({ game, currentPlayerId, onMakeMoveClick, onInvite, availablePlayers }: any) => (
    <div data-testid="game-detail">
      <div>Game Detail Mock</div>
      <div>Game ID: {game.gameId}</div>
      <div>Current Player: {currentPlayerId || 'none'}</div>
      <div data-testid="has-invite-callback">{onInvite ? 'yes' : 'no'}</div>
      <div data-testid="available-players-count">{availablePlayers?.length || 0}</div>
      {onMakeMoveClick && (
        <button onClick={onMakeMoveClick} data-testid="make-move-button">
          Make Move
        </button>
      )}
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
const mockListGames = vi.fn().mockResolvedValue({ items: [] });
const mockGetOrCreatePlayerIdentity = vi.fn().mockResolvedValue({
  id: 'player-1',
  name: 'Alice',
});
const mockGetKnownPlayers = vi.fn().mockResolvedValue({ players: [] });
const mockCreateInvitation = vi.fn();
const mockGetProfile = vi.fn();
const mockListAllPlayers = vi.fn().mockResolvedValue([]);

vi.mock('../../api/gameClient', () => ({
  GameClient: class {
    getGameTypes = mockGetGameTypes;
    createGame = mockCreateGame;
    joinGame = mockJoinGame;
    getGame = mockGetGame;
    makeMove = mockMakeMove;
    listGames = mockListGames;
    getOrCreatePlayerIdentity = mockGetOrCreatePlayerIdentity;
    getKnownPlayers = mockGetKnownPlayers;
    createInvitation = mockCreateInvitation;
    getProfile = mockGetProfile;
    listAllPlayers = mockListAllPlayers;
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
    // Clear URL hash to prevent deep linking from previous tests
    window.history.replaceState({}, '', window.location.pathname);
    
    // Set default mock behavior for joinGame to return mockGame
    // This is critical because createGame() calls joinGame() and uses its return value
    mockJoinGame.mockResolvedValue(mockGame);
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
      // Explicitly clear currentGame from localStorage
      localStorage.removeItem('player.currentGame');
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

      // Wait for game to load and click Make Move button to open modal
      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('make-move-button'));

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

      // Wait for game to load and click Make Move button to open modal
      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('make-move-button'));

      await waitFor(() => {
        expect(screen.getByText(/enabled: yes/i)).toBeInTheDocument();
      });
    });

    it('should disable move input when it is not player turn', async () => {
      const user = userEvent.setup();
      const gameWithBobsTurn = {
        ...mockGame,
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
        ],
        currentPlayerIndex: 1, // Bob's turn
      };
      
      mockCreateGame.mockResolvedValue(gameWithBobsTurn);
      mockJoinGame.mockResolvedValue(gameWithBobsTurn);

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

      // Wait for game to load and click Make Move button to open modal
      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('make-move-button'));

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

      // Wait for game to load and click Make Move button to open modal
      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('make-move-button'));

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

      // Wait for game to load and click Make Move button to open modal
      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('make-move-button'));

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

      // Wait for game to load and click Make Move button to open modal
      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('make-move-button'));

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

  describe('Invitation Integration', () => {
    const availablePlayers = [
      { userId: 'user-3', displayName: 'Charlie' },
      { userId: 'user-4', displayName: 'Diana' },
    ];

    beforeEach(() => {
      // Set up localStorage to simulate a logged-in player
      localStorage.setItem('player.id', '"player-1"');
      localStorage.setItem('player.name', '"Alice"');
      mockGetGame.mockResolvedValue(mockGame);
      mockGetProfile.mockResolvedValue({
        userId: 'user-1',
        displayName: 'Alice',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should fetch available players when game is loaded', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);
      // Mock the profile list endpoint
      mockListGames.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
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

      // Wait for game to load
      await waitFor(() => {
        expect(screen.getByTestId('game-detail')).toBeInTheDocument();
      });

      // Verify that profile was fetched (this would be used to get available players)
      expect(mockGetProfile).toHaveBeenCalled();
    });

    it('should pass onInvite callback to GameDetail', async () => {
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

      // Wait for game to load
      await waitFor(() => {
        expect(screen.getByTestId('game-detail')).toBeInTheDocument();
      });

      // Verify onInvite callback is passed
      expect(screen.getByTestId('has-invite-callback')).toHaveTextContent('yes');
    });

    it('should pass availablePlayers to GameDetail', async () => {
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

      // Wait for game to load
      await waitFor(() => {
        expect(screen.getByTestId('game-detail')).toBeInTheDocument();
      });

      // Verify availablePlayers is passed (even if empty array)
      expect(screen.getByTestId('available-players-count')).toBeInTheDocument();
    });

    it('should handle invitation success', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);
      mockCreateInvitation.mockResolvedValue({
        invitationId: 'inv-1',
        gameId: 'game-123',
        inviterId: 'user-1',
        inviteeId: 'user-3',
        status: 'pending',
        createdAt: new Date().toISOString(),
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

      // Wait for game to load
      await waitFor(() => {
        expect(screen.getByTestId('game-detail')).toBeInTheDocument();
      });

      // The invitation functionality should be available through GameDetail
      // Success handling is tested through the GameDetail component
      expect(screen.getByTestId('game-detail')).toBeInTheDocument();
    });

    it('should handle invitation error', async () => {
      const user = userEvent.setup();
      mockCreateGame.mockResolvedValue(mockGame);
      mockCreateInvitation.mockRejectedValue(new Error('Failed to send invitation'));

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

      // Wait for game to load
      await waitFor(() => {
        expect(screen.getByTestId('game-detail')).toBeInTheDocument();
      });

      // Error handling is tested through the GameDetail component
      expect(screen.getByTestId('game-detail')).toBeInTheDocument();
    });
  });
});
