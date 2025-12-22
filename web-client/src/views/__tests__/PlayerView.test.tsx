import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { PlayerView } from '../PlayerView';

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

vi.mock('../../components/GameCreation/AIPlayerConfig', () => ({
  AIPlayerConfig: () => <div data-testid="ai-player-config">AI Player Config Mock</div>,
}));

// Mock the entire PlayerContext to avoid the problematic hooks
const mockPlayerContext = {
  currentGame: null,
  playerId: 'player-1',
  playerName: 'Alice',
  displayName: 'Alice',
  isNewUser: false,
  loading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  getKnownPlayerNames: vi.fn().mockResolvedValue([]),
  getAvailableGameTypes: vi.fn().mockResolvedValue([
    {
      type: 'tic-tac-toe',
      name: 'Tic Tac Toe',
      description: 'Classic game',
      minPlayers: 2,
      maxPlayers: 2,
    },
  ]),
  createGame: vi.fn(),
  joinGame: vi.fn(),
  loadGame: vi.fn(),
  submitMove: vi.fn(),
  refreshGame: vi.fn(),
  listAvailableGames: vi.fn().mockResolvedValue([]),
  listMyGames: vi.fn().mockResolvedValue([]),
};

vi.mock('../../context/PlayerContext', () => ({
  PlayerProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  usePlayer: () => mockPlayerContext,
}));

// Mock WebSocket context
vi.mock('../../context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useWebSocket: () => ({
    connected: true,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onGameUpdate: vi.fn(),
    onTurnNotification: vi.fn(),
  }),
}));

describe('PlayerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', window.location.pathname);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('Game Setup Screen', () => {
    it('should render game setup screen when no game is loaded', () => {
      render(<PlayerView />);

      expect(screen.getByText(/create new game/i)).toBeInTheDocument();
      expect(screen.getByText(/join existing game/i)).toBeInTheDocument();
    });

    it('should render create game form', async () => {
      render(<PlayerView />);

      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /create game/i })).toBeInTheDocument();
    });

    it('should render join game form', async () => {
      render(<PlayerView />);

      await waitFor(() => {
        expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();
    });

    it('should create game when create form is submitted', async () => {
      const user = userEvent.setup();
      
      render(<PlayerView />);

      // Wait for game types to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      });

      const gameTypeSelect = screen.getByLabelText(/game type/i);
      const gameNameInput = screen.getByLabelText(/game name/i);
      const createButton = screen.getByRole('button', { name: /create game/i });

      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');
      await user.type(gameNameInput, 'Test Game');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockPlayerContext.createGame).toHaveBeenCalledWith('tic-tac-toe', {
          gameName: 'Test Game',
          gameDescription: '',
          aiPlayers: undefined,
        });
      });
    });

    it('should join game when join form is submitted', async () => {
      const user = userEvent.setup();
      
      render(<PlayerView />);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();
      });

      const gameIdInput = screen.getByLabelText(/game id/i);
      const joinButton = screen.getByRole('button', { name: /join game/i });

      await user.type(gameIdInput, 'game-123');
      await user.click(joinButton);

      await waitFor(() => {
        expect(mockPlayerContext.joinGame).toHaveBeenCalledWith('game-123');
      });
    });
  });

  describe('Game View', () => {
    beforeEach(() => {
      // Mock a loaded game
      mockPlayerContext.currentGame = {
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
    });

    afterEach(() => {
      mockPlayerContext.currentGame = null;
    });

    it('should render game view when game is loaded', () => {
      render(<PlayerView />);

      // Verify we're now in game view (not setup screen)
      expect(screen.queryByText(/create new game/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('game-detail')).toBeInTheDocument();
    });

    it('should render GameDetail component with current player ID', () => {
      render(<PlayerView />);

      expect(screen.getByTestId('game-detail')).toBeInTheDocument();
      expect(screen.getByText(/current player: player-1/i)).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<PlayerView />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });
});