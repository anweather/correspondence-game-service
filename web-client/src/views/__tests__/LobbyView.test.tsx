import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import { LobbyView } from '../LobbyView';
import type { GameState } from '../../types/game';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

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

// Mock GameClient
const mockListGames = vi.fn();
const mockJoinGame = vi.fn();

vi.mock('../../api/gameClient', () => ({
  GameClient: class {
    listGames = mockListGames;
    joinGame = mockJoinGame;
  },
}));

const mockGames: GameState[] = [
  {
    gameId: 'game-1',
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
      gameName: 'Quick Tic-Tac-Toe',
      gameDescription: 'Fast game for beginners',
    },
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    gameId: 'game-2',
    gameType: 'connect-four',
    lifecycle: 'active',
    players: [
      { id: 'p2', name: 'Bob', joinedAt: '2024-01-02T00:00:00Z' },
      { id: 'p3', name: 'Charlie', joinedAt: '2024-01-02T00:01:00Z' },
    ],
    currentPlayerIndex: 0,
    phase: 'playing',
    board: { spaces: [], metadata: {} },
    moveHistory: [],
    metadata: {
      gameName: 'Connect Four Championship',
      gameDescription: 'Competitive match',
    },
    version: 3,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:05:00Z',
  },
  {
    gameId: 'game-3',
    gameType: 'tic-tac-toe',
    lifecycle: 'completed',
    players: [
      { id: 'p4', name: 'Diana', joinedAt: '2024-01-03T00:00:00Z' },
      { id: 'p5', name: 'Eve', joinedAt: '2024-01-03T00:01:00Z' },
    ],
    currentPlayerIndex: 1,
    phase: 'finished',
    board: { spaces: [], metadata: {} },
    moveHistory: [],
    metadata: {
      gameName: 'Finished Game',
    },
    version: 10,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:10:00Z',
    winner: 'p4',
  },
];

describe('LobbyView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockListGames.mockResolvedValue({
      items: mockGames,
      total: 3,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  describe('Game List Rendering', () => {
    it('should render lobby view with title', async () => {
      render(<LobbyView />);

      expect(screen.getByText(/lobby/i)).toBeInTheDocument();
    });

    it('should load and display games on mount', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(mockListGames).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
        expect(screen.getByText('Connect Four Championship')).toBeInTheDocument();
        expect(screen.getByText('Finished Game')).toBeInTheDocument();
      });
    });

    it('should display game cards with correct information', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Check game type is displayed (use getAllByText since there are multiple)
      expect(screen.getAllByText('tic-tac-toe').length).toBeGreaterThan(0);
      expect(screen.getAllByText('connect-four').length).toBeGreaterThan(0);

      // Check descriptions are displayed
      expect(screen.getByText('Fast game for beginners')).toBeInTheDocument();
      expect(screen.getByText('Competitive match')).toBeInTheDocument();
    });

    it('should display player count for each game', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Check player counts (format: X/Y) - use getAllByText since there might be multiple
      const playerCounts = screen.getAllByText(/\d+\/\d+/);
      expect(playerCounts.length).toBeGreaterThan(0);
      
      // Verify specific counts exist
      expect(screen.getAllByText(/1\/2/).length).toBeGreaterThan(0); // game-1
      expect(screen.getAllByText(/2\/2/).length).toBeGreaterThan(0); // game-2
    });

    it('should display game state for each game', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Check lifecycle states are displayed
      expect(screen.getByText('waiting_for_players')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  describe('Filtering Logic', () => {
    it('should render filter controls', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Check for filter component
      expect(screen.getByLabelText(/game type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should filter games by game type', async () => {
      const user = await import('@testing-library/user-event').then(m => m.default.setup());
      
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Initially all games are shown
      expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      expect(screen.getByText('Connect Four Championship')).toBeInTheDocument();

      // Select tic-tac-toe filter
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');

      await waitFor(() => {
        // Only tic-tac-toe games should be visible
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
        expect(screen.queryByText('Connect Four Championship')).not.toBeInTheDocument();
      });
    });

    it('should filter games by status', async () => {
      const user = await import('@testing-library/user-event').then(m => m.default.setup());
      
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Select waiting_for_players filter
      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'waiting_for_players');

      await waitFor(() => {
        // Only waiting games should be visible
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
        expect(screen.queryByText('Connect Four Championship')).not.toBeInTheDocument();
        expect(screen.queryByText('Finished Game')).not.toBeInTheDocument();
      });
    });

    it('should filter games by search text', async () => {
      const user = await import('@testing-library/user-event').then(m => m.default.setup());
      
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/search games/i);
      await user.type(searchInput, 'Championship');

      await waitFor(() => {
        // Only matching games should be visible
        expect(screen.queryByText('Quick Tic-Tac-Toe')).not.toBeInTheDocument();
        expect(screen.getByText('Connect Four Championship')).toBeInTheDocument();
        expect(screen.queryByText('Finished Game')).not.toBeInTheDocument();
      });
    });

    it('should combine multiple filters', async () => {
      const user = await import('@testing-library/user-event').then(m => m.default.setup());
      
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Filter by game type
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');

      // Filter by status
      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'waiting_for_players');

      await waitFor(() => {
        // Only games matching both filters should be visible
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
        expect(screen.queryByText('Connect Four Championship')).not.toBeInTheDocument();
        expect(screen.queryByText('Finished Game')).not.toBeInTheDocument();
      });
    });

    it('should reset filters when clear button is clicked', async () => {
      const user = await import('@testing-library/user-event').then(m => m.default.setup());
      
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Apply a filter
      const gameTypeSelect = screen.getByLabelText(/game type/i);
      await user.selectOptions(gameTypeSelect, 'tic-tac-toe');

      await waitFor(() => {
        expect(screen.queryByText('Connect Four Championship')).not.toBeInTheDocument();
      });

      // Reset by selecting "All Types"
      await user.selectOptions(gameTypeSelect, '');

      await waitFor(() => {
        // All games should be visible again
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
        expect(screen.getByText('Connect Four Championship')).toBeInTheDocument();
        expect(screen.getByText('Finished Game')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Empty States', () => {
    it('should display loading state while fetching games', () => {
      mockListGames.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LobbyView />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display empty state when no games exist', async () => {
      mockListGames.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText(/no games available/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when filters match no games', async () => {
      const user = await import('@testing-library/user-event').then(m => m.default.setup());
      
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Search for something that doesn't exist
      const searchInput = screen.getByPlaceholderText(/search games/i);
      await user.type(searchInput, 'NonexistentGame');

      await waitFor(() => {
        expect(screen.getByText(/no games match your filters/i)).toBeInTheDocument();
      });
    });

    it('should display error state when loading fails', async () => {
      mockListGames.mockRejectedValue(new Error('Failed to load games'));

      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load games/i)).toBeInTheDocument();
      });
    });

    it('should provide retry button on error', async () => {
      mockListGames.mockRejectedValueOnce(new Error('Failed to load games'));

      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load games/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Mock successful retry
      mockListGames.mockResolvedValue({
        items: mockGames,
        total: 3,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      retryButton.click();

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });
    });
  });

  describe('Join Game Flow', () => {
    it('should display join button for games waiting for players', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Game 1 is waiting for players, should have join button
      const joinButtons = screen.getAllByRole('button', { name: /join game/i });
      expect(joinButtons.length).toBeGreaterThan(0);
    });

    it('should call joinGame when join button is clicked', async () => {
      mockJoinGame.mockResolvedValue({
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [
          { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'user-1', name: 'Test User', joinedAt: '2024-01-01T00:02:00Z' },
        ],
        currentPlayerIndex: 0,
        phase: 'playing',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:02:00Z',
      });

      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      const joinButton = screen.getAllByRole('button', { name: /join game/i })[0];
      joinButton.click();

      await waitFor(() => {
        expect(mockJoinGame).toHaveBeenCalledWith('game-1');
      });
    });

    it('should navigate to game after successful join', async () => {
      mockJoinGame.mockResolvedValue({
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: 'active',
        players: [
          { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
          { id: 'user-1', name: 'Test User', joinedAt: '2024-01-01T00:02:00Z' },
        ],
        currentPlayerIndex: 0,
        phase: 'playing',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        version: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:02:00Z',
      });

      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      const joinButton = screen.getAllByRole('button', { name: /join game/i })[0];
      joinButton.click();

      await waitFor(() => {
        expect(mockJoinGame).toHaveBeenCalledWith('game-1');
      });

      // Should navigate to the game
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/game/game-1');
      });
    });

    it('should display error message when join fails', async () => {
      mockJoinGame.mockRejectedValue(new Error('Game is full'));

      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      const joinButton = screen.getAllByRole('button', { name: /join game/i })[0];
      joinButton.click();

      await waitFor(() => {
        expect(screen.getByText(/game is full/i)).toBeInTheDocument();
      });
    });

    it('should not display join button for full games', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Connect Four Championship')).toBeInTheDocument();
      });

      // Game 2 is full (2/2 players), should not have join button for it
      // but should have view button instead
      const viewButtons = screen.getAllByRole('button', { name: /view game/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it('should not display join button for completed games', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Finished Game')).toBeInTheDocument();
      });

      // Game 3 is completed, should not have join button
      const allButtons = screen.getAllByRole('button');
      const joinButtons = allButtons.filter(btn => btn.textContent?.includes('Join'));
      
      // Should only have join button for game-1 (waiting for players)
      expect(joinButtons.length).toBe(1);
    });
  });

  describe('Responsive Design', () => {
    it('should render game cards in grid layout', async () => {
      render(<LobbyView />);

      await waitFor(() => {
        expect(screen.getByText('Quick Tic-Tac-Toe')).toBeInTheDocument();
      });

      // Check that games are rendered (grid layout is CSS-based)
      const gameCards = screen.getAllByRole('article');
      expect(gameCards.length).toBe(3);
    });
  });
});
