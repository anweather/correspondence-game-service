import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import { AdminView } from '../AdminView';
import { AdminProvider } from '../../context/AdminContext';
import type { GameState } from '../../types/game';

// Mock child components
vi.mock('../../components/GameList/GameList', () => ({
  GameList: ({ games, onSelect, onDelete }: any) => (
    <div data-testid="game-list">
      <div>Game List Mock</div>
      <div>Games count: {games.length}</div>
      {games.map((game: GameState) => (
        <div key={game.gameId}>
          <span>{game.gameId}</span>
          <button onClick={() => onSelect(game.gameId)}>Select {game.gameId}</button>
          <button onClick={() => onDelete(game.gameId)}>Delete {game.gameId}</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../components/GameDetail/GameDetail', () => ({
  GameDetail: ({ game }: any) => (
    <div data-testid="game-detail">
      <div>Game Detail Mock</div>
      <div>Game ID: {game.gameId}</div>
    </div>
  ),
}));

vi.mock('../../components/PlayerPanel/PlayerPanel', () => ({
  PlayerPanel: ({ game, impersonatedPlayer, onImpersonate, onAddPlayer }: any) => (
    <div data-testid="player-panel">
      <div>Player Panel Mock</div>
      <div>Game: {game.gameId}</div>
      <div>Impersonated: {impersonatedPlayer || 'none'}</div>
      <button onClick={() => onImpersonate('player-1')}>Impersonate player-1</button>
      <button onClick={() => onAddPlayer('Test Player')}>Add Player</button>
    </div>
  ),
}));

// Mock GameClient
const mockListGames = vi.fn().mockResolvedValue({
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
});

const mockGetGame = vi.fn();
const mockCreateGame = vi.fn();
const mockJoinGame = vi.fn();
const mockDeleteGame = vi.fn();

vi.mock('../../api/gameClient', () => ({
  GameClient: class {
    listGames = mockListGames;
    getGame = mockGetGame;
    createGame = mockCreateGame;
    joinGame = mockJoinGame;
    deleteGame = mockDeleteGame;
  },
}));

const mockGames: GameState[] = [
  {
    gameId: 'game-1',
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
  },
  {
    gameId: 'game-2',
    gameType: 'tic-tac-toe',
    lifecycle: 'completed',
    players: [
      { id: 'p3', name: 'Charlie', joinedAt: '2024-01-02T00:00:00Z' },
      { id: 'p4', name: 'Diana', joinedAt: '2024-01-02T00:01:00Z' },
    ],
    currentPlayerIndex: 1,
    phase: 'finished',
    board: { spaces: [], metadata: {} },
    moveHistory: [],
    metadata: {},
    version: 5,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:05:00Z',
  },
];

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render admin view with header', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.getByText(/admin view/i)).toBeInTheDocument();
  });

  it('should render GameList component', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.getByTestId('game-list')).toBeInTheDocument();
  });

  it('should render filter controls', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('should render create game button', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.getByRole('button', { name: /create game/i })).toBeInTheDocument();
  });

  it('should display empty state when no game is selected', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.getByText(/select a game/i)).toBeInTheDocument();
  });

  it('should not render GameDetail when no game is selected', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.queryByTestId('game-detail')).not.toBeInTheDocument();
  });

  it('should not render PlayerPanel when no game is selected', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    expect(screen.queryByTestId('player-panel')).not.toBeInTheDocument();
  });

  it('should apply active filter class to selected filter button', () => {
    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    const allButton = screen.getByRole('button', { name: /all/i });
    // CSS modules generate hashed class names, so we check if the class contains 'active'
    expect(allButton.className).toMatch(/active/i);
  });

  it('should filter games based on selected filter', async () => {
    mockListGames.mockResolvedValue({
      items: mockGames,
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Games count: 2')).toBeInTheDocument();
    });

    // Click active filter
    const activeButton = screen.getByRole('button', { name: /^active$/i });
    activeButton.click();

    // Should show only active games (1 game)
    await waitFor(() => {
      expect(screen.getByText('Games count: 1')).toBeInTheDocument();
    });
  });

  it('should load games on mount', async () => {
    mockListGames.mockResolvedValue({
      items: mockGames,
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    await waitFor(() => {
      expect(mockListGames).toHaveBeenCalled();
    });
  });

  it('should display error message when loading fails', async () => {
    mockListGames.mockRejectedValue(new Error('Failed to load games'));

    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load games/i)).toBeInTheDocument();
    });
  });

  it('should call refresh when refresh button is clicked', async () => {
    mockListGames.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    render(
      <AdminProvider>
        <AdminView />
      </AdminProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(mockListGames).toHaveBeenCalled();
    });

    const initialCallCount = mockListGames.mock.calls.length;

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    refreshButton.click();

    await waitFor(() => {
      expect(mockListGames.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});
